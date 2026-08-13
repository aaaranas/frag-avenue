/**
 * Pure "Scent Intelligence" aggregations.
 * No Prisma, no React, no Next. Fixture-testable.
 *
 * See docs/RECOMMENDATION_ENGINE.md and .claude/skills/frag-domain/SKILL.md
 * for definitions.
 */

export type Hemisphere = "north" | "south";
export type Season = "winter" | "spring" | "summer" | "autumn";

export type WearForInsights = {
  fragranceId: string;
  wornAt: Date;
  enjoyment: number | null;
  weatherCondition: string | null;
};

export type FragranceAccords = {
  fragranceId: string;
  accords: Array<{ name: string; strength: number }>; // strength 1..5
};

// ---- Preferred accords -----------------------------------------------------

export type AccordPreference = {
  accord: string;
  wearCount: number;
  weightedScore: number;
  share: number; // 0..1 share of total accord-weight
};

/**
 * For each wear, distribute one unit of weight across the fragrance's accords
 * in proportion to their strength (Σ strengths = the wear's total contribution).
 * When the wear carries an enjoyment rating (1..5), scale by `enjoyment / 3` so
 * a 5-star wear counts ~1.67× a 3-star wear and a 1-star wear ~0.33×; unrated
 * wears count as neutral (weight 1). Then rank by weighted score and compute
 * each accord's share of the total.
 */
export function preferredAccords(
  wears: WearForInsights[],
  fragranceAccords: FragranceAccords[],
  limit = 5,
): AccordPreference[] {
  const accordsByFragrance = new Map<string, FragranceAccords["accords"]>();
  for (const fa of fragranceAccords) accordsByFragrance.set(fa.fragranceId, fa.accords);

  const scores = new Map<string, { weight: number; count: number }>();

  for (const w of wears) {
    const accords = accordsByFragrance.get(w.fragranceId);
    if (!accords || accords.length === 0) continue;
    const strengthTotal = accords.reduce((s, a) => s + Math.max(0, a.strength), 0);
    if (strengthTotal <= 0) continue;

    const rating = w.enjoyment === null ? 1 : Math.max(0.1, w.enjoyment / 3);
    for (const a of accords) {
      const share = a.strength / strengthTotal;
      const contribution = share * rating;
      const cur = scores.get(a.name) ?? { weight: 0, count: 0 };
      cur.weight += contribution;
      cur.count += 1;
      scores.set(a.name, cur);
    }
  }

  const totalWeight = Array.from(scores.values()).reduce((s, v) => s + v.weight, 0);
  const rows: AccordPreference[] = Array.from(scores.entries()).map(([accord, v]) => ({
    accord,
    wearCount: v.count,
    weightedScore: v.weight,
    share: totalWeight > 0 ? v.weight / totalWeight : 0,
  }));
  return rows
    .sort((a, b) => b.weightedScore - a.weightedScore || a.accord.localeCompare(b.accord))
    .slice(0, limit);
}

// ---- House frequencies -----------------------------------------------------

export type BrandFrequency = {
  brand: string;
  bottles: number;
  wears: number;
  wearsPerBottle: number; // decimal, count / bottles
};

export function houseFrequencies(
  items: Array<{ brandName: string }>,
  wears: Array<{ brandName: string }>,
  limit = 5,
): BrandFrequency[] {
  const bottles = new Map<string, number>();
  for (const i of items) bottles.set(i.brandName, (bottles.get(i.brandName) ?? 0) + 1);

  const wearCounts = new Map<string, number>();
  for (const w of wears) wearCounts.set(w.brandName, (wearCounts.get(w.brandName) ?? 0) + 1);

  const allBrands = new Set<string>([...bottles.keys(), ...wearCounts.keys()]);
  const rows: BrandFrequency[] = Array.from(allBrands).map((brand) => {
    const b = bottles.get(brand) ?? 0;
    const w = wearCounts.get(brand) ?? 0;
    return { brand, bottles: b, wears: w, wearsPerBottle: b > 0 ? w / b : 0 };
  });
  return rows.sort((a, b) => b.wears - a.wears || a.brand.localeCompare(b.brand)).slice(0, limit);
}

// ---- Seasonal patterns -----------------------------------------------------

/**
 * Meteorological seasons. UTC month is used for grouping — an acceptable
 * simplification until per-user timezone-aware bucketing is implemented.
 */
export function seasonForMonth(monthIndex: number, hemisphere: Hemisphere): Season {
  // monthIndex: 0..11 (Jan..Dec). Values outside the range fall back to winter.
  const north: readonly Season[] = [
    "winter",
    "winter",
    "spring",
    "spring",
    "spring",
    "summer",
    "summer",
    "summer",
    "autumn",
    "autumn",
    "autumn",
    "winter",
  ];
  const flip: Record<Season, Season> = {
    winter: "summer",
    spring: "autumn",
    summer: "winter",
    autumn: "spring",
  };
  const idx = Math.max(0, Math.min(11, Math.trunc(monthIndex)));
  const s = north[idx] ?? "winter";
  return hemisphere === "north" ? s : flip[s];
}

export type SeasonalCount = { season: Season; wears: number; share: number };

export function seasonalPatterns(
  wears: WearForInsights[],
  hemisphere: Hemisphere = "north",
): SeasonalCount[] {
  const counts: Record<Season, number> = { winter: 0, spring: 0, summer: 0, autumn: 0 };
  for (const w of wears) {
    const month = w.wornAt.getUTCMonth();
    counts[seasonForMonth(month, hemisphere)] += 1;
  }
  const total = wears.length;
  return (["winter", "spring", "summer", "autumn"] as const).map((season) => ({
    season,
    wears: counts[season],
    share: total > 0 ? counts[season] / total : 0,
  }));
}

// ---- Weather-rating correlation --------------------------------------------

export type WeatherRatingRow = {
  bucket: string;
  wears: number; // wears that have this bucket
  ratedWears: number; // wears in the bucket with an enjoyment score
  avgEnjoyment: number | null; // null when ratedWears === 0
};

export function weatherRatingCorrelation(
  wears: WearForInsights[],
  minRatedPerBucket = 3,
): WeatherRatingRow[] {
  const map = new Map<string, { wears: number; ratedWears: number; sum: number }>();
  for (const w of wears) {
    if (!w.weatherCondition) continue;
    const cur = map.get(w.weatherCondition) ?? { wears: 0, ratedWears: 0, sum: 0 };
    cur.wears += 1;
    if (w.enjoyment !== null) {
      cur.ratedWears += 1;
      cur.sum += w.enjoyment;
    }
    map.set(w.weatherCondition, cur);
  }
  return Array.from(map.entries())
    .map(([bucket, v]) => ({
      bucket,
      wears: v.wears,
      ratedWears: v.ratedWears,
      avgEnjoyment: v.ratedWears >= minRatedPerBucket ? v.sum / v.ratedWears : null,
    }))
    .sort((a, b) => b.wears - a.wears || a.bucket.localeCompare(b.bucket));
}

// ---- Collection concentration ----------------------------------------------

/**
 * Share of total wears represented by the top-N fragrances. High values (>0.7)
 * suggest a small "signature rotation" — most bottles get little use.
 */
export function collectionConcentration(
  wears: Array<{ fragranceId: string }>,
  topN = 5,
): { topWears: number; totalWears: number; ratio: number } {
  const counts = new Map<string, number>();
  for (const w of wears) counts.set(w.fragranceId, (counts.get(w.fragranceId) ?? 0) + 1);
  const sorted = Array.from(counts.values()).sort((a, b) => b - a);
  const total = wears.length;
  const topWears = sorted.slice(0, topN).reduce((s, n) => s + n, 0);
  return { topWears, totalWears: total, ratio: total > 0 ? topWears / total : 0 };
}

// ---- Cost per wear ---------------------------------------------------------

export type CpwRow = {
  fragranceId: string;
  name: string;
  brand: string;
  currency: string;
  totalPurchaseMinor: number;
  wearCount: number;
  cpwMinor: number;
};

/**
 * Per-fragrance cost per wear. Aggregates all owned bottles of a given
 * fragrance to a single spend + wear count. Excludes fragrances:
 *   - with zero wears (undefined CPW — not "infinity"),
 *   - with no priced bottle (nothing to divide),
 *   - whose priced bottles are in multiple currencies (no fake FX).
 * Sorted ascending (best value first).
 */
export function costPerWearLeaderboard(
  items: Array<{
    fragranceId: string;
    fragranceName: string;
    brandName: string;
    purchasePriceMinor: number | null;
    currency: string | null;
  }>,
  wears: Array<{ fragranceId: string }>,
  limit = 5,
): CpwRow[] {
  const wearCount = new Map<string, number>();
  for (const w of wears) wearCount.set(w.fragranceId, (wearCount.get(w.fragranceId) ?? 0) + 1);

  type Agg = {
    name: string;
    brand: string;
    currency: string | null;
    total: number;
    conflict: boolean;
  };
  const spend = new Map<string, Agg>();

  for (const i of items) {
    if (i.purchasePriceMinor === null || !i.currency) continue;
    const prev = spend.get(i.fragranceId);
    if (!prev) {
      spend.set(i.fragranceId, {
        name: i.fragranceName,
        brand: i.brandName,
        currency: i.currency,
        total: i.purchasePriceMinor,
        conflict: false,
      });
    } else if (prev.currency !== i.currency) {
      prev.conflict = true;
    } else {
      prev.total += i.purchasePriceMinor;
    }
  }

  const rows: CpwRow[] = [];
  for (const [fragranceId, agg] of spend) {
    if (agg.conflict || !agg.currency) continue;
    const n = wearCount.get(fragranceId) ?? 0;
    if (n < 1) continue;
    rows.push({
      fragranceId,
      name: agg.name,
      brand: agg.brand,
      currency: agg.currency,
      totalPurchaseMinor: agg.total,
      wearCount: n,
      cpwMinor: Math.round(agg.total / n),
    });
  }

  return rows
    .sort((a, b) => a.cpwMinor - b.cpwMinor || a.name.localeCompare(b.name))
    .slice(0, limit);
}
