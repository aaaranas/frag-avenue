import { describe, it, expect } from "vitest";
import { recommend, type Candidate } from "./recommender";
import type { WearHistoryRow } from "./sub-scores";

const NOW = new Date("2026-08-13T12:00:00Z");

function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    fragranceId: "f-default",
    collectionItemId: "c-default",
    fragranceName: "Default",
    brandName: "Brand",
    accords: [{ name: "woody", strength: 5 }],
    ...over,
  };
}

function history(rows: Array<Partial<WearHistoryRow> & { fragranceId: string }>): WearHistoryRow[] {
  return rows.map((r) => ({
    occasion: "CASUAL",
    enjoyment: null,
    wornAt: NOW,
    ...r,
  }));
}

describe("recommend — cold-start user", () => {
  it("returns candidates without a percentage score", () => {
    const out = recommend({
      candidates: [
        candidate({ fragranceId: "a", fragranceName: "A" }),
        candidate({
          fragranceId: "b",
          fragranceName: "B",
          accords: [{ name: "fresh", strength: 5 }],
        }),
      ],
      history: [],
      userPreference: [],
      weather: { temperatureC: 28, condition: "clear" },
      occasion: "CASUAL",
      now: NOW,
    });
    expect(out).toHaveLength(2);
    for (const r of out) {
      expect(r.coldStart).toBe(true);
      expect(r.displayScore).toBeNull();
      expect(r.reasons.length).toBeGreaterThan(0);
    }
  });

  it("still ranks by rawScore — a hot-weather-appropriate fragrance beats an incompatible one", () => {
    const [top] = recommend({
      candidates: [
        candidate({ fragranceId: "warm", accords: [{ name: "gourmand", strength: 5 }] }),
        candidate({
          fragranceId: "summer",
          fragranceName: "Summer",
          accords: [
            { name: "fresh", strength: 5 },
            { name: "aquatic", strength: 4 },
          ],
        }),
      ],
      history: [],
      userPreference: [],
      weather: { temperatureC: 30, condition: "clear" },
      occasion: "CASUAL",
      now: NOW,
    });
    expect(top!.fragranceId).toBe("summer");
  });
});

describe("recommend — mature user", () => {
  // ≥10 wears, ≥5 distinct fragrances, rated wears present → mature user.
  const matureHistory = history([
    ...Array(12)
      .fill(null)
      .map(() => ({ fragranceId: "loved", enjoyment: 5 })),
    { fragranceId: "loved", enjoyment: 3 },
    { fragranceId: "loved", enjoyment: 5 },
    ...Array(8)
      .fill(null)
      .map(() => ({ fragranceId: "unloved", enjoyment: 2 })),
    { fragranceId: "unloved", enjoyment: 3 },
    { fragranceId: "filler1", enjoyment: 3 },
    { fragranceId: "filler2", enjoyment: 3 },
    { fragranceId: "filler3", enjoyment: 3 },
  ] as Array<Partial<WearHistoryRow> & { fragranceId: string }>);

  it("displays a percentage score and ranks the well-rated fragrance ahead", () => {
    const out = recommend({
      candidates: [
        candidate({
          fragranceId: "loved",
          fragranceName: "Loved",
          accords: [{ name: "amber", strength: 5 }],
        }),
        candidate({
          fragranceId: "unloved",
          fragranceName: "Unloved",
          accords: [{ name: "amber", strength: 5 }],
        }),
      ],
      history: matureHistory,
      userPreference: [{ accord: "amber", share: 1 }],
      weather: { temperatureC: 8, condition: "clear" },
      occasion: "CASUAL",
      now: NOW,
    });
    expect(out[0]!.fragranceId).toBe("loved");
    expect(out[0]!.displayScore).not.toBeNull();
    expect(out[0]!.coldStart).toBe(false);
    expect(out[0]!.reasons.some((r) => /5\/5|amber|weather/.test(r))).toBe(true);
  });
});

describe("recommend — tie-break", () => {
  it("with identical scores, the fragrance worn least recently wins", () => {
    // Two candidates with no accord signal and no user history → same rawScore.
    // Rotation-diversity differs.
    const twoDaysAgo = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
    const out = recommend({
      candidates: [
        candidate({ fragranceId: "recent", fragranceName: "Recent", accords: [] }),
        candidate({ fragranceId: "older", fragranceName: "Older", accords: [] }),
      ],
      history: [
        // enough wears + rated to be mature so the test doesn't hit cold-start
        ...history(
          Array.from({ length: 12 }, (_, i) => ({
            fragranceId: `x${i % 5}`,
            enjoyment: 3,
          })) as Array<Partial<WearHistoryRow> & { fragranceId: string }>,
        ),
        { fragranceId: "recent", occasion: "CASUAL", enjoyment: null, wornAt: twoDaysAgo },
        { fragranceId: "older", occasion: "CASUAL", enjoyment: null, wornAt: tenDaysAgo },
      ],
      userPreference: [],
      weather: { temperatureC: null, condition: null },
      occasion: "CASUAL",
      now: NOW,
    });
    expect(out[0]!.fragranceId).toBe("older");
  });
});

describe("recommend — weight override", () => {
  it("swapping the weighting strategy changes the ranking", () => {
    const cands = [
      candidate({
        fragranceId: "fresh",
        fragranceName: "Fresh",
        accords: [
          { name: "fresh", strength: 5 },
          { name: "aquatic", strength: 3 },
        ],
      }),
      candidate({
        fragranceId: "warm",
        fragranceName: "Warm",
        accords: [{ name: "gourmand", strength: 5 }],
      }),
    ];
    const hist = history([
      // enough wears + distinct fragrances to clear maturity thresholds
      ...(Array.from({ length: 8 }, () => ({ fragranceId: "fresh", enjoyment: 4 })) as Array<
        Partial<WearHistoryRow> & { fragranceId: string }
      >),
      { fragranceId: "warm", enjoyment: 5 },
      { fragranceId: "warm", enjoyment: 5 },
      { fragranceId: "warm", enjoyment: 5 },
      { fragranceId: "warm", enjoyment: 5 },
      { fragranceId: "filler1", enjoyment: 3 },
      { fragranceId: "filler2", enjoyment: 3 },
      { fragranceId: "filler3", enjoyment: 3 },
    ]);
    const context = {
      candidates: cands,
      history: hist,
      userPreference: [
        { accord: "fresh", share: 0.5 },
        { accord: "aquatic", share: 0.3 },
      ],
      weather: { temperatureC: 26, condition: "clear" },
      occasion: "CASUAL" as const,
      now: NOW,
    };
    const [topWithWeather] = recommend({
      ...context,
      weights: {
        weatherFit: 0.9,
        preferenceFit: 0.02,
        occasionFit: 0.02,
        historicalPerformance: 0.02,
        rotationDiversity: 0.04,
      },
    });
    const [topWithHistory] = recommend({
      ...context,
      weights: {
        weatherFit: 0.02,
        preferenceFit: 0.02,
        occasionFit: 0.02,
        historicalPerformance: 0.9,
        rotationDiversity: 0.04,
      },
    });
    expect(topWithWeather!.fragranceId).toBe("fresh");
    expect(topWithHistory!.fragranceId).toBe("warm");
  });
});
