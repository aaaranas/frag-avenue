import { describe, it, expect } from "vitest";
import {
  preferredAccords,
  houseFrequencies,
  seasonForMonth,
  seasonalPatterns,
  weatherRatingCorrelation,
  collectionConcentration,
  costPerWearLeaderboard,
  type WearForInsights,
  type FragranceAccords,
} from "./insights";

function wear(over: Partial<WearForInsights> = {}): WearForInsights {
  return {
    fragranceId: "f1",
    wornAt: new Date("2026-06-01T10:00:00Z"),
    enjoyment: null,
    weatherCondition: null,
    ...over,
  };
}

describe("preferredAccords", () => {
  const accords: FragranceAccords[] = [
    {
      fragranceId: "f1",
      accords: [
        { name: "fresh", strength: 5 },
        { name: "citrus", strength: 3 },
      ],
    },
    {
      fragranceId: "f2",
      accords: [
        { name: "sweet", strength: 5 },
        { name: "gourmand", strength: 4 },
      ],
    },
  ];

  it("distributes weight across accords by strength", () => {
    const out = preferredAccords([wear({ fragranceId: "f1" })], accords);
    const fresh = out.find((r) => r.accord === "fresh");
    const citrus = out.find((r) => r.accord === "citrus");
    expect(fresh?.weightedScore).toBeCloseTo(5 / 8, 5);
    expect(citrus?.weightedScore).toBeCloseTo(3 / 8, 5);
  });

  it("weights by enjoyment when rated", () => {
    const [a] = preferredAccords([wear({ fragranceId: "f1", enjoyment: 5 })], accords, 1);
    const [b] = preferredAccords([wear({ fragranceId: "f1", enjoyment: 1 })], accords, 1);
    expect(a!.weightedScore).toBeGreaterThan(b!.weightedScore);
  });

  it("shares sum to 1 across all returned rows for a single-fragrance wearer", () => {
    const out = preferredAccords([wear({ fragranceId: "f1" })], accords, 5);
    const total = out.reduce((s, r) => s + r.share, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("skips wears whose fragrance has no accords", () => {
    const out = preferredAccords([wear({ fragranceId: "ghost" })], accords);
    expect(out).toEqual([]);
  });
});

describe("houseFrequencies", () => {
  it("counts bottles and wears per brand, ranks by wears", () => {
    const out = houseFrequencies(
      [{ brandName: "Creed" }, { brandName: "Creed" }, { brandName: "Dior" }],
      [{ brandName: "Creed" }, { brandName: "Dior" }, { brandName: "Dior" }, { brandName: "Dior" }],
    );
    expect(out).toEqual([
      { brand: "Dior", bottles: 1, wears: 3, wearsPerBottle: 3 },
      { brand: "Creed", bottles: 2, wears: 1, wearsPerBottle: 0.5 },
    ]);
  });

  it("wearsPerBottle is 0 for a brand you wear but don't own", () => {
    const out = houseFrequencies([], [{ brandName: "Creed" }]);
    expect(out[0]).toMatchObject({ brand: "Creed", bottles: 0, wears: 1, wearsPerBottle: 0 });
  });
});

describe("seasonForMonth", () => {
  it("assigns northern hemisphere months to meteorological seasons", () => {
    expect(seasonForMonth(0, "north")).toBe("winter"); // Jan
    expect(seasonForMonth(3, "north")).toBe("spring"); // Apr
    expect(seasonForMonth(6, "north")).toBe("summer"); // Jul
    expect(seasonForMonth(9, "north")).toBe("autumn"); // Oct
    expect(seasonForMonth(11, "north")).toBe("winter"); // Dec
  });
  it("flips for southern hemisphere", () => {
    expect(seasonForMonth(0, "south")).toBe("summer");
    expect(seasonForMonth(6, "south")).toBe("winter");
  });
});

describe("seasonalPatterns", () => {
  it("counts wears by season and shares sum to 1", () => {
    const out = seasonalPatterns([
      wear({ wornAt: new Date("2026-01-15T00:00:00Z") }), // winter
      wear({ wornAt: new Date("2026-04-15T00:00:00Z") }), // spring
      wear({ wornAt: new Date("2026-07-15T00:00:00Z") }), // summer
      wear({ wornAt: new Date("2026-07-16T00:00:00Z") }), // summer
    ]);
    const asMap = Object.fromEntries(out.map((r) => [r.season, r]));
    expect(asMap.summer!.wears).toBe(2);
    expect(out.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 5);
  });

  it("all zeros → shares are all 0 (no NaN)", () => {
    const out = seasonalPatterns([]);
    expect(out.every((r) => r.wears === 0 && r.share === 0)).toBe(true);
  });
});

describe("weatherRatingCorrelation", () => {
  it("returns avg only when enough rated wears per bucket", () => {
    const ws: WearForInsights[] = [
      wear({ weatherCondition: "clear", enjoyment: 5 }),
      wear({ weatherCondition: "clear", enjoyment: 4 }),
      wear({ weatherCondition: "clear", enjoyment: 4 }),
      wear({ weatherCondition: "rain", enjoyment: 2 }), // only 1 rated
    ];
    const out = weatherRatingCorrelation(ws, 3);
    const clear = out.find((r) => r.bucket === "clear")!;
    const rain = out.find((r) => r.bucket === "rain")!;
    expect(clear.avgEnjoyment).toBeCloseTo(13 / 3, 5);
    expect(rain.avgEnjoyment).toBeNull();
    expect(rain.ratedWears).toBe(1);
  });

  it("ignores wears with no weather bucket", () => {
    expect(weatherRatingCorrelation([wear({ weatherCondition: null })])).toEqual([]);
  });
});

describe("collectionConcentration", () => {
  it("computes top-N share of wears", () => {
    const ws = [
      { fragranceId: "a" },
      { fragranceId: "a" },
      { fragranceId: "a" },
      { fragranceId: "b" },
      { fragranceId: "b" },
      { fragranceId: "c" },
      { fragranceId: "d" },
    ];
    const out = collectionConcentration(ws, 2);
    expect(out.topWears).toBe(5); // a=3 + b=2
    expect(out.totalWears).toBe(7);
    expect(out.ratio).toBeCloseTo(5 / 7, 5);
  });

  it("zero wears → ratio 0, no NaN", () => {
    expect(collectionConcentration([]).ratio).toBe(0);
  });
});

describe("costPerWearLeaderboard", () => {
  const items = [
    {
      fragranceId: "a",
      fragranceName: "Aventus",
      brandName: "Creed",
      purchasePriceMinor: 30000,
      currency: "USD",
    },
    {
      fragranceId: "b",
      fragranceName: "Layton",
      brandName: "PdM",
      purchasePriceMinor: 25000,
      currency: "USD",
    },
    {
      fragranceId: "c",
      fragranceName: "BR540",
      brandName: "MFK",
      purchasePriceMinor: 40000,
      currency: "USD",
    },
  ];

  it("cheapest per wear ranks first", () => {
    const wears = [
      ...Array(30).fill({ fragranceId: "a" }), // 30 wears → CPW $10
      ...Array(2).fill({ fragranceId: "b" }), // 2 wears → CPW $125
    ];
    const out = costPerWearLeaderboard(items, wears, 3);
    expect(out[0]!.fragranceId).toBe("a");
    expect(out[0]!.cpwMinor).toBe(1000);
    expect(out[1]!.fragranceId).toBe("b");
  });

  it("excludes fragrances with zero wears", () => {
    const out = costPerWearLeaderboard(items, [{ fragranceId: "a" }]);
    expect(out.map((r) => r.fragranceId)).toEqual(["a"]);
  });

  it("excludes fragrances whose bottles are priced in mixed currencies", () => {
    const mixed = [
      {
        fragranceId: "x",
        fragranceName: "X",
        brandName: "B",
        purchasePriceMinor: 10000,
        currency: "USD",
      },
      {
        fragranceId: "x",
        fragranceName: "X",
        brandName: "B",
        purchasePriceMinor: 10000,
        currency: "EUR",
      },
    ];
    const out = costPerWearLeaderboard(mixed, [{ fragranceId: "x" }, { fragranceId: "x" }]);
    expect(out).toEqual([]);
  });

  it("sums multiple bottles of the same fragrance in the same currency", () => {
    const dbl = [
      {
        fragranceId: "y",
        fragranceName: "Y",
        brandName: "B",
        purchasePriceMinor: 20000,
        currency: "USD",
      },
      {
        fragranceId: "y",
        fragranceName: "Y",
        brandName: "B",
        purchasePriceMinor: 20000,
        currency: "USD",
      },
    ];
    const out = costPerWearLeaderboard(dbl, Array(8).fill({ fragranceId: "y" }));
    expect(out[0]!.cpwMinor).toBe(5000); // 40000/8
  });
});
