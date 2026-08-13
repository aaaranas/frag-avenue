/**
 * Frag Avenue recommendation scoring — pure functions.
 *
 * This file must not import Next, React, or Prisma. It consumes plain inputs and
 * returns plain outputs so tests can pin behaviour with fixtures and a future
 * non-web client can share it.
 *
 * See docs/RECOMMENDATION_ENGINE.md for the full contract.
 */

export type SubScoreName =
  "weatherFit" | "preferenceFit" | "occasionFit" | "historicalPerformance" | "rotationDiversity";

export type Weights = Record<SubScoreName, number>;

export const DEFAULT_WEIGHTS: Weights = {
  weatherFit: 0.3,
  preferenceFit: 0.25,
  occasionFit: 0.2,
  historicalPerformance: 0.15,
  rotationDiversity: 0.1,
};

export type SubScores = Record<SubScoreName, number>;

export type ScoredCandidate = {
  fragranceId: string;
  fragranceName: string;
  score: number; // 0..1
  displayScore: number | null; // 0..100 or null for cold-start
  reasons: string[];
  subScores: SubScores;
  coldStart: boolean;
};

export function normalizeWeights(weights: Weights): Weights {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  const out = {} as Weights;
  for (const key of Object.keys(weights) as SubScoreName[]) {
    out[key] = weights[key] / total;
  }
  return out;
}

export function weightedScore(subScores: SubScores, weights: Weights): number {
  let sum = 0;
  for (const key of Object.keys(weights) as SubScoreName[]) {
    sum += (subScores[key] ?? 0) * weights[key];
  }
  // Clamp defensively — sub-scores should already be [0,1].
  return Math.max(0, Math.min(1, sum));
}

export type ColdStartInput = {
  totalWears: number;
  distinctFragrancesWorn: number;
  ratedWears: number;
};

export function isColdStart(input: ColdStartInput): boolean {
  return input.totalWears < 10 || input.distinctFragrancesWorn < 5 || input.ratedWears === 0;
}

/**
 * Weights adjusted for cold-start users: drop preference & historical-performance
 * (which we don't have data for) and re-normalize the rest.
 */
export function coldStartWeights(base: Weights = DEFAULT_WEIGHTS): Weights {
  return normalizeWeights({
    ...base,
    preferenceFit: 0,
    historicalPerformance: 0,
  });
}
