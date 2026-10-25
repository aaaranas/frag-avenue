import { describe, expect, it } from "vitest";
import { buildStats, type StatsItem, type StatsWear } from "./stats";

const TZ = "Asia/Manila";
// 2026-10-25 20:00 in Manila.
const NOW = new Date("2026-10-25T12:00:00Z");

/** A wear at 20:00 Manila time, `daysAgo` local days before today. */
function wear(daysAgo: number, fragranceId: string, extra: Partial<StatsWear> = {}): StatsWear {
  const t = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return {
    wornAt: t,
    timeZone: TZ,
    fragranceId,
    brandId: `brand_${fragranceId}`,
    collectionItemId: `item_${fragranceId}`,
    hasWeather: false,
    hasCheckIn: false,
    ...extra,
  };
}

const items: StatsItem[] = [
  { id: "item_a", kind: "BOTTLE", fragranceId: "a" },
  { id: "item_b", kind: "BOTTLE", fragranceId: "b" },
  { id: "item_c", kind: "DECANT", fragranceId: "c" },
  { id: "item_w", kind: "WISHLIST", fragranceId: "w" },
];
const accords = new Map([
  ["a", [{ name: "woody", strength: 1 }]],
  ["b", [{ name: "fresh", strength: 1 }]],
]);

const base = { items, accordsByFragrance: accords, now: NOW, timeZone: TZ };

describe("buildStats", () => {
  const wears = [wear(0, "a"), wear(1, "a"), wear(2, "b"), wear(40, "b"), wear(100, "c")];

  it("counts totals, unique scents, and most worn over all time", () => {
    const s = buildStats({ ...base, wears, range: "all" });
    expect(s.totalWears).toBe(5);
    expect(s.uniqueScents).toBe(3);
    expect(s.mostWorn.map((m) => [m.fragranceId, m.wears])).toEqual([
      ["a", 2],
      ["b", 2],
      ["c", 1],
    ]);
  });

  it("limits totals, most worn, and accords to the range, inclusive of today", () => {
    const s = buildStats({ ...base, wears, range: "30d" });
    expect(s.totalWears).toBe(3);
    expect(s.uniqueScents).toBe(2);
    expect(s.accords.map((a) => a.accord)).toEqual(["woody", "fresh"]);
    expect(s.accords[0]!.share).toBeCloseTo(2 / 3);
    expect(buildStats({ ...base, wears, range: "90d" }).totalWears).toBe(4);
  });

  it("computes the streak from all wears, whatever the range", () => {
    expect(buildStats({ ...base, wears, range: "30d" }).streakDays).toBe(3);
  });

  it("lists owned items untouched 30+ days or never worn, never wishlist", () => {
    const s = buildStats({ ...base, wears, range: "30d" });
    expect(s.untouched).toEqual([
      { itemId: "item_c", fragranceId: "c", kind: "DECANT", daysSince: 100 },
    ]);
    const fresh = buildStats({ ...base, wears: [], range: "all" });
    expect(fresh.untouched.map((u) => u.itemId)).toEqual(["item_a", "item_b", "item_c"]);
  });

  it("buckets days in each wear's own zone, and today in the user's", () => {
    // 23:30 Manila on Oct 24 is 15:30 UTC: still "yesterday" for the streak.
    const late = { ...wear(0, "a"), wornAt: new Date("2026-10-24T15:30:00Z") };
    expect(buildStats({ ...base, wears: [late], range: "all" }).streakDays).toBe(1);
    // The same instant logged in Los Angeles is Oct 24 there too.
    const la = { ...late, timeZone: "America/Los_Angeles" };
    expect(buildStats({ ...base, wears: [la], range: "all" }).streakDays).toBe(1);
  });

  it("is empty-safe", () => {
    const s = buildStats({ ...base, items: [], wears: [], range: "all" });
    expect(s).toMatchObject({
      totalWears: 0,
      uniqueScents: 0,
      streakDays: 0,
      mostWorn: [],
      accords: [],
    });
  });

  it("counts wears with both weather and a check-in for the weather chart", () => {
    const s = buildStats({
      ...base,
      range: "all",
      wears: [
        wear(0, "a", { hasWeather: true, hasCheckIn: true }),
        wear(1, "a", { hasWeather: true }),
        wear(2, "a", { hasCheckIn: true }),
      ],
    });
    expect(s.weatherPerformancePoints).toBe(1);
  });
});
