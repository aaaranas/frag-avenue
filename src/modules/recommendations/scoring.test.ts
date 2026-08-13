import { describe, it, expect } from "vitest";
import {
  DEFAULT_WEIGHTS,
  coldStartWeights,
  isColdStart,
  normalizeWeights,
  weightedScore,
} from "./scoring";

describe("recommendation scoring — pure functions", () => {
  it("default weights sum to 1", () => {
    const total = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("normalizeWeights re-normalizes to sum to 1", () => {
    const w = normalizeWeights({
      weatherFit: 1,
      preferenceFit: 1,
      occasionFit: 1,
      historicalPerformance: 1,
      rotationDiversity: 1,
    });
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
    expect(w.weatherFit).toBeCloseTo(0.2, 5);
  });

  it("weightedScore is a weighted sum, clamped to [0,1]", () => {
    const s = weightedScore(
      {
        weatherFit: 1,
        preferenceFit: 1,
        occasionFit: 1,
        historicalPerformance: 1,
        rotationDiversity: 1,
      },
      DEFAULT_WEIGHTS,
    );
    expect(s).toBeCloseTo(1, 5);

    const zero = weightedScore(
      {
        weatherFit: 0,
        preferenceFit: 0,
        occasionFit: 0,
        historicalPerformance: 0,
        rotationDiversity: 0,
      },
      DEFAULT_WEIGHTS,
    );
    expect(zero).toBe(0);
  });

  it("isColdStart triggers when wears are sparse", () => {
    expect(isColdStart({ totalWears: 0, distinctFragrancesWorn: 0, ratedWears: 0 })).toBe(true);
    expect(isColdStart({ totalWears: 20, distinctFragrancesWorn: 8, ratedWears: 0 })).toBe(true);
    expect(isColdStart({ totalWears: 20, distinctFragrancesWorn: 8, ratedWears: 5 })).toBe(false);
  });

  it("coldStartWeights zeroes preference/history and still sums to 1", () => {
    const w = coldStartWeights();
    expect(w.preferenceFit).toBe(0);
    expect(w.historicalPerformance).toBe(0);
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});
