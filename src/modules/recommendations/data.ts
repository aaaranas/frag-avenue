import "server-only";
import { prisma } from "@/lib/prisma";
import { preferredAccords } from "@/modules/analytics";
import { recommend, type Recommendation, type Candidate } from "./recommender";
import type { WearHistoryRow } from "./sub-scores";
import type { WeatherContext } from "./sub-scores";

/**
 * Fetch everything the recommender needs and hand off to the pure composer.
 * `userId` MUST come from the server session — never from a client field.
 */
export async function getRecommendations(
  userId: string,
  context: { weather: WeatherContext; occasion: string; now: Date; limit?: number },
): Promise<Recommendation[]> {
  const [items, wears] = await Promise.all([
    prisma.collectionItem.findMany({
      where: { userId },
      select: {
        id: true,
        fragrance: {
          select: {
            id: true,
            name: true,
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
    prisma.wearLog.findMany({
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

  if (items.length === 0) return [];

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

  return recommend(
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
}
