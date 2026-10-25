import "server-only";
import { prisma } from "@/lib/prisma";
import {
  preferredAccords,
  houseFrequencies,
  seasonalPatterns,
  weatherRatingCorrelation,
  collectionConcentration,
  costPerWearLeaderboard,
  type AccordPreference,
  type BrandFrequency,
  type SeasonalCount,
  type WeatherRatingRow,
  type CpwRow,
  type Hemisphere,
  type WearForInsights,
} from "./insights";

export type Insights = {
  totalWears: number;
  ratedWears: number;
  distinctWorn: number;
  preferredAccords: AccordPreference[];
  houseFrequencies: BrandFrequency[];
  seasonalPatterns: SeasonalCount[];
  weatherRating: WeatherRatingRow[];
  concentration: { topWears: number; totalWears: number; ratio: number };
  costPerWear: CpwRow[];
};

export async function getInsights(
  userId: string,
  hemisphere: Hemisphere = "north",
): Promise<Insights> {
  const [wears, items] = await Promise.all([
    prisma.wear.findMany({
      where: { userId },
      select: {
        fragranceId: true,
        wornAt: true,
        enjoyment: true,
        weatherCondition: true,
        fragrance: { select: { brand: { select: { name: true } } } },
      },
    }),
    // Owned items only: wishlist entries have no cost per wear.
    prisma.wardrobeItem.findMany({
      where: { userId, kind: { not: "WISHLIST" } },
      select: {
        fragranceId: true,
        purchasePriceMinor: true,
        currency: true,
        fragrance: {
          select: { name: true, brand: { select: { name: true } } },
        },
      },
    }),
  ]);

  // Fragrance ids referenced by wears — used to fetch accords in a single query.
  const wornFragranceIds = Array.from(new Set(wears.map((w) => w.fragranceId)));
  const accordRows =
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
  for (const r of accordRows) {
    const list = accordsByFragrance.get(r.fragranceId) ?? [];
    list.push({ name: r.accord.name, strength: r.strength });
    accordsByFragrance.set(r.fragranceId, list);
  }

  const wearInputs: WearForInsights[] = wears.map((w) => ({
    fragranceId: w.fragranceId,
    wornAt: w.wornAt,
    enjoyment: w.enjoyment,
    weatherCondition: w.weatherCondition,
  }));

  const fragranceAccordsList = Array.from(accordsByFragrance.entries()).map(
    ([fragranceId, accords]) => ({ fragranceId, accords }),
  );

  const itemsForCpw = items.map((i) => ({
    fragranceId: i.fragranceId,
    fragranceName: i.fragrance.name,
    brandName: i.fragrance.brand.name,
    purchasePriceMinor: i.purchasePriceMinor,
    currency: i.currency,
  }));

  return {
    totalWears: wears.length,
    ratedWears: wears.filter((w) => w.enjoyment !== null).length,
    distinctWorn: wornFragranceIds.length,
    preferredAccords: preferredAccords(wearInputs, fragranceAccordsList),
    houseFrequencies: houseFrequencies(
      items.map((i) => ({ brandName: i.fragrance.brand.name })),
      wears.map((w) => ({ brandName: w.fragrance.brand.name })),
    ),
    seasonalPatterns: seasonalPatterns(wearInputs, hemisphere),
    weatherRating: weatherRatingCorrelation(wearInputs),
    concentration: collectionConcentration(wears),
    costPerWear: costPerWearLeaderboard(itemsForCpw, wears),
  };
}
