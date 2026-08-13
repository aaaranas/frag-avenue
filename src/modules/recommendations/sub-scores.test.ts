import { describe, it, expect } from "vitest";
import {
  weatherFit,
  preferenceFit,
  occasionFit,
  historicalPerformance,
  historicalStats,
  rotationDiversity,
  tempBucket,
} from "./sub-scores";

describe("weatherFit", () => {
  it("null when temperature is unknown", () => {
    expect(
      weatherFit([{ name: "fresh", strength: 5 }], { temperatureC: null, condition: null }),
    ).toBeNull();
  });

  it("null when the fragrance has no accords the model knows", () => {
    expect(
      weatherFit([{ name: "unknown", strength: 5 }], { temperatureC: 25, condition: null }),
    ).toBeNull();
  });

  it("fresh/aquatic fragrance scores high in hot weather, low in cold", () => {
    const fresh = [
      { name: "fresh", strength: 5 },
      { name: "aquatic", strength: 4 },
    ];
    const hot = weatherFit(fresh, { temperatureC: 28, condition: "clear" })!;
    const cold = weatherFit(fresh, { temperatureC: 2, condition: "clear" })!;
    expect(hot).toBeGreaterThan(0.85);
    expect(cold).toBeLessThan(0.1);
  });

  it("gourmand/warm-spicy scores high in the cold", () => {
    const winter = [
      { name: "gourmand", strength: 5 },
      { name: "warm-spicy", strength: 4 },
    ];
    const hot = weatherFit(winter, { temperatureC: 30, condition: "clear" })!;
    const cold = weatherFit(winter, { temperatureC: 3, condition: "clear" })!;
    expect(cold).toBeGreaterThan(hot);
  });
});

describe("tempBucket", () => {
  it("buckets sensible ranges", () => {
    expect(tempBucket(-2)).toBe("cold");
    expect(tempBucket(10)).toBe("cool");
    expect(tempBucket(20)).toBe("mild");
    expect(tempBucket(25)).toBe("warm");
    expect(tempBucket(32)).toBe("hot");
  });
});

describe("preferenceFit", () => {
  const profile = [
    { accord: "woody", share: 0.5 },
    { accord: "amber", share: 0.3 },
  ];

  it("high similarity when accords overlap", () => {
    const s = preferenceFit(
      [
        { name: "woody", strength: 5 },
        { name: "amber", strength: 3 },
      ],
      profile,
    )!;
    expect(s).toBeGreaterThan(0.95);
  });

  it("zero similarity when no shared accords", () => {
    const s = preferenceFit(
      [
        { name: "aquatic", strength: 5 },
        { name: "citrus", strength: 3 },
      ],
      profile,
    )!;
    expect(s).toBe(0);
  });

  it("null when the profile is empty (cold-start)", () => {
    expect(preferenceFit([{ name: "woody", strength: 5 }], [])).toBeNull();
  });
});

describe("occasionFit", () => {
  const now = new Date("2026-08-13T12:00:00Z");
  const history = [
    { fragranceId: "a", occasion: "WORK", enjoyment: 5, wornAt: now },
    { fragranceId: "a", occasion: "WORK", enjoyment: 4, wornAt: now },
    { fragranceId: "a", occasion: "EVENING", enjoyment: 2, wornAt: now },
  ];

  it("returns rated average / 5 when there is history in this occasion", () => {
    expect(occasionFit("a", "WORK", history)).toBeCloseTo(9 / 2 / 5, 5);
  });

  it("returns 0.6 when worn in the occasion but never rated", () => {
    const noRating = [{ fragranceId: "b", occasion: "WORK", enjoyment: null, wornAt: now }];
    expect(occasionFit("b", "WORK", noRating)).toBe(0.6);
  });

  it("returns 0.5 neutral when never worn in this occasion", () => {
    expect(occasionFit("z", "SPORT", history)).toBe(0.5);
  });
});

describe("historicalPerformance", () => {
  const now = new Date();
  it("null when user has no rated wears at all (cold-start)", () => {
    expect(historicalPerformance("a", [], null)).toBeNull();
  });

  it("shrinks toward the global mean when wear count is low", () => {
    // Two 5-star wears, global mean = 3, m = 3 → (10 + 3*3) / (2+3) = 19/5 = 3.8 → /5 = 0.76
    const history = [
      { fragranceId: "a", occasion: "WORK", enjoyment: 5, wornAt: now },
      { fragranceId: "a", occasion: "WORK", enjoyment: 5, wornAt: now },
    ];
    const s = historicalPerformance("a", history, 3, 3)!;
    expect(s).toBeCloseTo(19 / 5 / 5, 5);
  });

  it("converges to the raw mean when wear count is large", () => {
    const history = Array(50).fill({
      fragranceId: "a",
      occasion: "WORK",
      enjoyment: 5,
      wornAt: now,
    });
    const s = historicalPerformance("a", history, 3, 3)!;
    expect(s).toBeGreaterThan(0.95);
  });
});

describe("historicalStats", () => {
  const now = new Date();
  it("counts wears and rated wears, mean over rated only", () => {
    const stats = historicalStats("a", [
      { fragranceId: "a", occasion: "WORK", enjoyment: 5, wornAt: now },
      { fragranceId: "a", occasion: "WORK", enjoyment: null, wornAt: now },
      { fragranceId: "a", occasion: "WORK", enjoyment: 3, wornAt: now },
      { fragranceId: "b", occasion: "WORK", enjoyment: 5, wornAt: now },
    ]);
    expect(stats).toEqual({ wearCount: 3, ratedCount: 2, meanEnjoyment: 4 });
  });
});

describe("rotationDiversity", () => {
  const now = new Date("2026-08-13T12:00:00Z");
  it("1 when never worn", () => {
    expect(rotationDiversity(null, now)).toBe(1);
  });
  it("0 when worn just now", () => {
    expect(rotationDiversity(now, now)).toBe(0);
  });
  it("~0.5 mid-window", () => {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(rotationDiversity(sevenDaysAgo, now)).toBeCloseTo(0.5, 5);
  });
  it("1 at or past the decay horizon", () => {
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(rotationDiversity(twoWeeksAgo, now)).toBe(1);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(rotationDiversity(monthAgo, now)).toBe(1);
  });
});
