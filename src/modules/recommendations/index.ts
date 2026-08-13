// Public surface of the recommendations module.
// Pure primitives + composer are safe to import anywhere; the server-only
// `data.ts` is imported directly by server components.
export {
  DEFAULT_WEIGHTS,
  isColdStart,
  coldStartWeights,
  normalizeWeights,
  weightedScore,
} from "./scoring";
export type { Weights, SubScoreName, SubScores, ScoredCandidate, ColdStartInput } from "./scoring";
export { recommend } from "./recommender";
export type { Recommendation, Candidate, RecommendationInput } from "./recommender";
export {
  weatherFit,
  preferenceFit,
  occasionFit,
  historicalPerformance,
  rotationDiversity,
  tempBucket,
} from "./sub-scores";
export type { AccordVec, WearHistoryRow, WeatherContext, TempBucket } from "./sub-scores";
