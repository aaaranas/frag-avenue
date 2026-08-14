/**
 * Composer for the Frag Avenue advisor.
 * Pure — takes plain inputs, returns scored candidates.
 * See docs/RECOMMENDATION_ENGINE.md.
 */

import {
  DEFAULT_WEIGHTS,
  coldStartWeights,
  isColdStart,
  normalizeWeights,
  weightedScore,
  type SubScoreName,
  type SubScores,
  type Weights,
} from "./scoring";
import {
  historicalPerformance,
  historicalStats,
  occasionFit,
  preferenceFit,
  rotationDiversity,
  tempBucket,
  weatherFit,
  type AccordVec,
  type WearHistoryRow,
  type WeatherContext,
} from "./sub-scores";

export type Candidate = {
  fragranceId: string;
  collectionItemId: string;
  fragranceName: string;
  brandName: string;
  accords: AccordVec;
};

export type RecommendationInput = {
  candidates: Candidate[];
  history: WearHistoryRow[];
  userPreference: Array<{ accord: string; share: number }>;
  weather: WeatherContext;
  occasion: string;
  now: Date;
  weights?: Weights;
};

export type Recommendation = {
  fragranceId: string;
  collectionItemId: string;
  fragranceName: string;
  brandName: string;
  accords: AccordVec;
  displayScore: number | null;
  rawScore: number;
  subScores: SubScores;
  contributingWeights: Weights;
  reasons: string[];
  coldStart: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Produce the top-N recommendations for the given context.
 * When the user is cold-start (see `isColdStart`), preference and historical
 * sub-scores are dropped and remaining weights are re-normalized. The result
 * also carries `displayScore = null` so the UI can render "Suggested" rather
 * than a fake percentage.
 */
export function recommend(input: RecommendationInput, limit = 3): Recommendation[] {
  if (input.candidates.length === 0) return [];

  const distinctWorn = new Set(input.history.map((w) => w.fragranceId)).size;
  const ratedCount = input.history.filter((w) => w.enjoyment !== null).length;
  const cold = isColdStart({
    totalWears: input.history.length,
    distinctFragrancesWorn: distinctWorn,
    ratedWears: ratedCount,
  });

  const activeWeights = normalizeWeights(
    input.weights ?? (cold ? coldStartWeights() : DEFAULT_WEIGHTS),
  );
  const globalMean = userGlobalMean(input.history);

  // last-worn per fragrance, computed once
  const lastWornByFragrance = buildLastWornMap(input.history);

  const scored = input.candidates.map((c) => {
    const wFit = weatherFit(c.accords, input.weather);
    const pFit = cold ? null : preferenceFit(c.accords, input.userPreference);
    const oFit = occasionFit(c.fragranceId, input.occasion, input.history);
    const hPerf = cold ? null : historicalPerformance(c.fragranceId, input.history, globalMean);
    const rDiv = rotationDiversity(lastWornByFragrance.get(c.fragranceId) ?? null, input.now);

    // Convert nulls to 0 and remove their weights, then renormalize so the
    // remaining sub-scores still sum to their intended totals.
    const provided: Partial<Record<SubScoreName, number>> = {};
    if (wFit !== null) provided.weatherFit = wFit;
    if (pFit !== null) provided.preferenceFit = pFit;
    provided.occasionFit = oFit;
    if (hPerf !== null) provided.historicalPerformance = hPerf;
    provided.rotationDiversity = rDiv;

    const effectiveWeights = renormalizeForProvided(activeWeights, provided);
    const subScores: SubScores = {
      weatherFit: provided.weatherFit ?? 0,
      preferenceFit: provided.preferenceFit ?? 0,
      occasionFit: provided.occasionFit ?? 0,
      historicalPerformance: provided.historicalPerformance ?? 0,
      rotationDiversity: provided.rotationDiversity ?? 0,
    };
    const raw = weightedScore(subScores, effectiveWeights);

    const stats = historicalStats(c.fragranceId, input.history);
    const lastWornAt = lastWornByFragrance.get(c.fragranceId) ?? null;
    const daysSinceLastWear =
      lastWornAt === null
        ? null
        : Math.floor((input.now.getTime() - lastWornAt.getTime()) / DAY_MS);

    const reasons = buildReasons({
      subScores,
      weights: effectiveWeights,
      cold,
      candidate: c,
      weather: input.weather,
      occasion: input.occasion,
      historicalMean: stats.meanEnjoyment,
      historicalRated: stats.ratedCount,
      daysSinceLastWear,
      userPreference: input.userPreference,
    });

    return {
      fragranceId: c.fragranceId,
      collectionItemId: c.collectionItemId,
      fragranceName: c.fragranceName,
      brandName: c.brandName,
      accords: c.accords,
      rawScore: raw,
      displayScore: cold ? null : Math.round(raw * 100),
      subScores,
      contributingWeights: effectiveWeights,
      reasons,
      coldStart: cold,
    };
  });

  // Rank; tie-break by longer time since last wear (encourage exploration), then
  // by fragrance name.
  scored.sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    const aLast = lastWornByFragrance.get(a.fragranceId)?.getTime() ?? 0;
    const bLast = lastWornByFragrance.get(b.fragranceId)?.getTime() ?? 0;
    if (aLast !== bLast) return aLast - bLast;
    return a.fragranceName.localeCompare(b.fragranceName);
  });

  if (cold) {
    // Cold-start: prioritize variety across accord families.
    return diversifyByTopAccord(scored, limit);
  }
  return scored.slice(0, limit);
}

// --------------------------------------------------------------------------

function userGlobalMean(history: WearHistoryRow[]): number | null {
  const rated = history.filter((w) => w.enjoyment !== null);
  if (rated.length === 0) return null;
  return rated.reduce((s, w) => s + (w.enjoyment ?? 0), 0) / rated.length;
}

function buildLastWornMap(history: WearHistoryRow[]): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const w of history) {
    const prev = map.get(w.fragranceId);
    if (!prev || w.wornAt > prev) map.set(w.fragranceId, w.wornAt);
  }
  return map;
}

function renormalizeForProvided(
  base: Weights,
  provided: Partial<Record<SubScoreName, number>>,
): Weights {
  const active: Weights = {
    weatherFit: 0,
    preferenceFit: 0,
    occasionFit: 0,
    historicalPerformance: 0,
    rotationDiversity: 0,
  };
  for (const key of Object.keys(base) as SubScoreName[]) {
    if (provided[key] !== undefined) active[key] = base[key];
  }
  return normalizeWeights(active);
}

function diversifyByTopAccord(scored: Recommendation[], limit: number): Recommendation[] {
  // Not strictly needed once we return top scores, but cold-start callers
  // should see one suggestion per accord family the user owns before we repeat
  // a family. Because this composer does not know the candidate's dominant
  // accord in a stable way here, we approximate by using the first reason —
  // reasons are stable across calls with the same input, so this is
  // deterministic.
  const picked: Recommendation[] = [];
  const seenBucket = new Set<string>();
  for (const s of scored) {
    const bucket = s.reasons[0] ?? "";
    if (!seenBucket.has(bucket) || picked.length < limit) {
      picked.push(s);
      seenBucket.add(bucket);
    }
    if (picked.length >= limit) break;
  }
  return picked.slice(0, limit);
}

// ---- Reason generation -----------------------------------------------------

type ReasonInput = {
  subScores: SubScores;
  weights: Weights;
  cold: boolean;
  candidate: Candidate;
  weather: WeatherContext;
  occasion: string;
  historicalMean: number | null;
  historicalRated: number;
  daysSinceLastWear: number | null;
  userPreference: Array<{ accord: string; share: number }>;
};

/**
 * Return 2–3 reason strings, sourced from the sub-scores that contributed most
 * to the final score. Every reason is derived from an actual number — no
 * post-hoc narration.
 */
export function buildReasons(input: ReasonInput): string[] {
  const contributions: Array<{ name: SubScoreName; contribution: number }> = (
    Object.keys(input.weights) as SubScoreName[]
  )
    .map((k) => ({ name: k, contribution: input.subScores[k] * input.weights[k] }))
    .filter((c) => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);

  const out: string[] = [];
  const MAX = 3;

  for (const { name } of contributions) {
    if (out.length >= MAX) break;
    const line = reasonFor(name, input);
    if (line) out.push(line);
  }

  return out;
}

function reasonFor(name: SubScoreName, ctx: ReasonInput): string | null {
  const s = ctx.subScores[name];
  switch (name) {
    case "weatherFit": {
      if (ctx.weather.temperatureC === null) return null;
      if (s < 0.35) return null;
      const bucket = tempBucket(ctx.weather.temperatureC);
      return `well-suited to today's ${bucket} weather (${Math.round(ctx.weather.temperatureC)}°C)`;
    }
    case "preferenceFit": {
      if (s < 0.4) return null;
      const shared = topSharedAccord(ctx.candidate.accords, ctx.userPreference);
      if (!shared) return null;
      return `aligns with your preferred ${shared} profile`;
    }
    case "occasionFit": {
      if (s <= 0.5) return null;
      if (s === 0.6) {
        return `you've reached for this for ${occasionLabel(ctx.occasion)} before`;
      }
      const stars = Math.round(s * 5);
      return `you rate this ${stars}/5 for ${occasionLabel(ctx.occasion)}`;
    }
    case "historicalPerformance": {
      if (s < 0.6 || ctx.historicalMean === null || ctx.historicalRated === 0) return null;
      return `you've rated this ${ctx.historicalMean.toFixed(1)}/5 across ${ctx.historicalRated} wear${ctx.historicalRated === 1 ? "" : "s"}`;
    }
    case "rotationDiversity": {
      if (ctx.daysSinceLastWear === null) {
        return ctx.cold ? "you haven't tried this yet" : "you've never logged a wear for this";
      }
      if (ctx.daysSinceLastWear < 3) return null;
      return `you haven't worn this in ${ctx.daysSinceLastWear} days`;
    }
  }
}

function topSharedAccord(
  accords: AccordVec,
  profile: Array<{ accord: string; share: number }>,
): string | null {
  const strengthMap = new Map(accords.map((a) => [a.name, a.strength]));
  let best: { name: string; product: number } | null = null;
  for (const p of profile) {
    const strength = strengthMap.get(p.accord);
    if (!strength) continue;
    const product = strength * p.share;
    if (!best || product > best.product) best = { name: p.accord, product };
  }
  return best?.name ?? null;
}

function occasionLabel(o: string): string {
  return o.charAt(0) + o.slice(1).toLowerCase();
}
