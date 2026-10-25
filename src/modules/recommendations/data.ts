import "server-only";
import { prisma } from "@/lib/prisma";
import { preferredAccords } from "@/modules/analytics";
import { bottleAppearance, fillRatio, type BottleAppearance } from "@/lib/bottle-appearance";
import { recommend, type Recommendation, type Candidate } from "./recommender";
import type { WearHistoryRow } from "./sub-scores";
import type { WeatherContext } from "./sub-scores";

/**
 * Fetch everything the recommender needs and hand off to the pure composer.
 * `userId` MUST come from the server session — never from a client field.
 */
/**
 * How a recommended bottle should be drawn, keyed by collection item id.
 *
 * This is presentation data and deliberately does NOT travel through
 * `recommend()` — that module is pure scoring logic and has no business knowing
 * about glass colours. The advisor page joins the two by collection item id.
 */
export type RecommendationBottle = BottleAppearance & {
  fillRatio: number | null;
  bottleSizeMl: number;
  remainingMl: number | null;
};

export type RecommendationsResult = {
  recommendations: Recommendation[];
  bottles: Map<string, RecommendationBottle>;
};

export async function getRecommendations(
  userId: string,
  context: { weather: WeatherContext; occasion: string; now: Date; limit?: number },
): Promise<RecommendationsResult> {
  const [items, wears] = await Promise.all([
    prisma.wardrobeItem.findMany({
      where: { userId },
      select: {
        id: true,
        bottleSizeMl: true,
        remainingMl: true,
        fragrance: {
          select: {
            id: true,
            name: true,
            concentration: true,
            bottleShape: true,
            glassColor: true,
            capColor: true,
            glassFinish: true,
            brand: { select: { name: true } },
            accords: {
              select: {
                strength: true,
                accord: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.wear.findMany({
      where: { userId },
      select: {
        fragranceId: true,
        occasion: true,
        enjoyment: true,
        wornAt: true,
      },
      orderBy: { wornAt: "desc" },
    }),
  ]);

  if (items.length === 0) return { recommendations: [], bottles: new Map() };

  const bottles = new Map<string, RecommendationBottle>(
    items.map((i) => [
      i.id,
      {
        ...bottleAppearance({
          concentration: i.fragrance.concentration,
          accords: i.fragrance.accords.map((a) => ({
            name: a.accord.name,
            strength: a.strength,
          })),
          bottleShape: i.fragrance.bottleShape,
          glassColor: i.fragrance.glassColor,
          capColor: i.fragrance.capColor,
          glassFinish: i.fragrance.glassFinish,
        }),
        fillRatio: fillRatio(i.bottleSizeMl, i.remainingMl),
        bottleSizeMl: i.bottleSizeMl,
        remainingMl: i.remainingMl,
      },
    ]),
  );

  // Build one candidate per COLLECTION ITEM (not per fragrance) so users owning
  // two bottles of the same fragrance can pick which bottle to reach for. The
  // composer scores fragrance-level attributes so multiple items of the same
  // fragrance will score identically; tie-break by name deterministically.
  const candidates: Candidate[] = items.map((i) => ({
    fragranceId: i.fragrance.id,
    collectionItemId: i.id,
    fragranceName: i.fragrance.name,
    brandName: i.fragrance.brand.name,
    accords: i.fragrance.accords.map((a) => ({ name: a.accord.name, strength: a.strength })),
  }));

  // Reuse the analytics accord-preference model as the user profile input.
  // Fetch worn-fragrance accords once, keyed by fragranceId.
  const wornFragranceIds = Array.from(new Set(wears.map((w) => w.fragranceId)));
  const wornAccords =
    wornFragranceIds.length === 0
      ? []
      : await prisma.fragranceAccord.findMany({
          where: { fragranceId: { in: wornFragranceIds } },
          select: {
            fragranceId: true,
            strength: true,
            accord: { select: { name: true } },
          },
        });

  const accordsByFragrance = new Map<string, Array<{ name: string; strength: number }>>();
  for (const r of wornAccords) {
    const list = accordsByFragrance.get(r.fragranceId) ?? [];
    list.push({ name: r.accord.name, strength: r.strength });
    accordsByFragrance.set(r.fragranceId, list);
  }
  const fragranceAccordsList = Array.from(accordsByFragrance.entries()).map(([id, accords]) => ({
    fragranceId: id,
    accords,
  }));

  const profile = preferredAccords(
    wears.map((w) => ({
      fragranceId: w.fragranceId,
      wornAt: w.wornAt,
      enjoyment: w.enjoyment,
      weatherCondition: null,
    })),
    fragranceAccordsList,
    10,
  );

  const history: WearHistoryRow[] = wears.map((w) => ({
    fragranceId: w.fragranceId,
    occasion: w.occasion,
    enjoyment: w.enjoyment,
    wornAt: w.wornAt,
  }));

  const recommendations = recommend(
    {
      candidates,
      history,
      userPreference: profile.map((p) => ({ accord: p.accord, share: p.share })),
      weather: context.weather,
      occasion: context.occasion,
      now: context.now,
    },
    context.limit ?? 3,
  );

  return { recommendations, bottles };
}
