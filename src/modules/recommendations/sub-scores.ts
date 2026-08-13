/**
 * Pure sub-score calculators for the Frag Avenue advisor.
 * No Prisma, no React, no Next. See docs/RECOMMENDATION_ENGINE.md.
 *
 * Every function returns a number in [0, 1] or `null` when the sub-score is
 * undefined for this candidate (the composer treats null as "skip this factor").
 */

export type AccordVec = Array<{ name: string; strength: number }>;

export type WearHistoryRow = {
  fragranceId: string;
  occasion: string;
  enjoyment: number | null;
  wornAt: Date;
};

// ---- weatherFit ------------------------------------------------------------

/**
 * Ideal outdoor-temperature (°C) per accord family. Derived from conventional
 * fragrance guidance — heavy/warm accords lean cold, fresh/aquatic lean hot.
 * Accords not listed contribute no weather signal (neutral).
 */
const IDEAL_TEMP_C: Record<string, number> = {
  aquatic: 28,
  fresh: 27,
  citrus: 27,
  "fresh-spicy": 24,
  fruity: 22,
  aromatic: 18,
  musky: 16,
  woody: 15,
  spicy: 12,
  sweet: 12,
  amber: 10,
  smoky: 10,
  tobacco: 8,
  "warm-spicy": 8,
  gourmand: 5,
};

const TEMP_DECAY = 20; // fit hits 0 when |temp - ideal| >= 20°C

export type WeatherContext = {
  temperatureC: number | null;
  condition: string | null;
};

export function weatherFit(accords: AccordVec, ctx: WeatherContext): number | null {
  if (ctx.temperatureC === null) return null;
  let weighted = 0;
  let strengthTotal = 0;
  for (const a of accords) {
    const ideal = IDEAL_TEMP_C[a.name];
    if (ideal === undefined) continue;
    const diff = Math.abs(ctx.temperatureC - ideal);
    const fit = Math.max(0, 1 - diff / TEMP_DECAY);
    weighted += a.strength * fit;
    strengthTotal += a.strength;
  }
  if (strengthTotal === 0) return null;
  const raw = weighted / strengthTotal;
  return clamp01(raw);
}

export type TempBucket = "cold" | "cool" | "mild" | "warm" | "hot";
export function tempBucket(temp: number): TempBucket {
  if (temp <= 5) return "cold";
  if (temp <= 14) return "cool";
  if (temp <= 22) return "mild";
  if (temp <= 28) return "warm";
  return "hot";
}

// ---- preferenceFit ---------------------------------------------------------

/**
 * Cosine similarity between the user's preferred-accord vector (typically the
 * output of `preferredAccords`, keyed by accord name with `share` as weight)
 * and the candidate fragrance's accord vector (strength-weighted).
 * Returns null when either vector is empty.
 */
export function preferenceFit(
  accords: AccordVec,
  userProfile: Array<{ accord: string; share: number }>,
): number | null {
  if (accords.length === 0 || userProfile.length === 0) return null;

  const profileMap = new Map(userProfile.map((p) => [p.accord, p.share]));
  const fragMap = new Map<string, number>();
  for (const a of accords) fragMap.set(a.name, (fragMap.get(a.name) ?? 0) + a.strength);

  let dot = 0;
  for (const [name, w] of fragMap) {
    const p = profileMap.get(name);
    if (p) dot += w * p;
  }
  const fragNorm = Math.sqrt(Array.from(fragMap.values()).reduce((s, v) => s + v * v, 0));
  const profNorm = Math.sqrt(userProfile.reduce((s, p) => s + p.share * p.share, 0));
  if (fragNorm === 0 || profNorm === 0) return null;
  return clamp01(dot / (fragNorm * profNorm));
}

// ---- occasionFit -----------------------------------------------------------

/**
 * Uses the user's own history for this fragrance + occasion when available:
 *   - has rated wears in this occasion → avg enjoyment / 5
 *   - has unrated wears in this occasion → mild 0.6 boost (user chose to reach for it)
 *   - never worn here → 0.5 neutral
 */
export function occasionFit(
  fragranceId: string,
  occasion: string,
  history: WearHistoryRow[],
): number {
  const relevant = history.filter((w) => w.fragranceId === fragranceId && w.occasion === occasion);
  if (relevant.length === 0) return 0.5;
  const rated = relevant.filter(
    (w): w is WearHistoryRow & { enjoyment: number } => w.enjoyment !== null,
  );
  if (rated.length === 0) return 0.6;
  const avg = rated.reduce((s, w) => s + w.enjoyment, 0) / rated.length;
  return clamp01(avg / 5);
}

// ---- historicalPerformance -------------------------------------------------

export type HistoricalStats = {
  wearCount: number;
  ratedCount: number;
  meanEnjoyment: number | null;
};

/**
 * Bayesian-shrunk mean enjoyment toward the user's global mean:
 *   score = ((sum + m * globalMean) / (n + m)) / 5
 * `m` (default 3) is the "pseudo-count" of prior observations. Returns null
 * when the user has no rated wears at all — the composer skips this factor.
 */
export function historicalPerformance(
  fragranceId: string,
  history: WearHistoryRow[],
  userGlobalMean: number | null,
  priorStrength = 3,
): number | null {
  if (userGlobalMean === null) return null;
  const rated = history.filter(
    (w): w is WearHistoryRow & { enjoyment: number } =>
      w.fragranceId === fragranceId && w.enjoyment !== null,
  );
  const n = rated.length;
  const sum = rated.reduce((s, w) => s + w.enjoyment, 0);
  const shrunk = (sum + priorStrength * userGlobalMean) / (n + priorStrength);
  return clamp01(shrunk / 5);
}

export function historicalStats(fragranceId: string, history: WearHistoryRow[]): HistoricalStats {
  const rows = history.filter((w) => w.fragranceId === fragranceId);
  const rated = rows.filter((w) => w.enjoyment !== null);
  const meanEnjoyment =
    rated.length > 0 ? rated.reduce((s, w) => s + (w.enjoyment ?? 0), 0) / rated.length : null;
  return { wearCount: rows.length, ratedCount: rated.length, meanEnjoyment };
}

// ---- rotationDiversity -----------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 0 when just worn (today), 1 when never worn or last-worn >= `decayDays` ago.
 * Linear ramp between. Encourages exploration and prevents the advisor from
 * suggesting the same bottle every day.
 */
export function rotationDiversity(lastWornAt: Date | null, now: Date, decayDays = 14): number {
  if (lastWornAt === null) return 1;
  const days = (now.getTime() - lastWornAt.getTime()) / DAY_MS;
  return clamp01(days / decayDays);
}

// ---- helpers ---------------------------------------------------------------

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
