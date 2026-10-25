/**
 * Derived wear statistics for Stats, Feed, and Clubs. Pure: no Prisma, no
 * React, no Next, no clock — every function takes `today` (a local date in the
 * user's current zone) or the data it needs explicitly.
 *
 * Day rule: a wear's day is its local date in the zone it was logged in
 * (`Wear.timeZone`); "today" is the local date in the user's current zone.
 * Callers convert with `localDate()` from `@/lib/time-zone`.
 *
 * Definitions: see `.claude/skills/frag-domain/SKILL.md`.
 */
import { addDays, daysBetween } from "@/lib/time-zone";

export type ItemKind = "BOTTLE" | "DECANT" | "SAMPLE" | "WISHLIST";
export type ChallengeKind = "UNIQUE_FRAGRANCES" | "UNIQUE_HOUSES";

/** A wear reduced to what derived stats need. `localDate` is `YYYY-MM-DD`. */
export type DatedWear = {
  localDate: string;
  fragranceId: string;
  brandId: string;
};

/** Wishlist entries are wanted, not owned. */
export function isOwned(kind: ItemKind): boolean {
  return kind !== "WISHLIST";
}

// ---- Streak ----------------------------------------------------------------

/**
 * Consecutive local days with at least one wear, ending today or yesterday.
 * A streak that last counted yesterday is still alive until today ends, so
 * not having logged yet today does not zero it. Dates after `today` (clock
 * skew, a wear logged in a zone ahead of the user's) are ignored.
 */
export function currentStreak(localDates: Iterable<string>, today: string): number {
  const days = new Set<string>();
  for (const d of localDates) if (d <= today) days.add(d);

  let cursor: string;
  if (days.has(today)) cursor = today;
  else if (days.has(addDays(today, -1))) cursor = addDays(today, -1);
  else return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// ---- Totals ----------------------------------------------------------------

/** Distinct fragrances among the wears. */
export function uniqueScents(wears: ReadonlyArray<Pick<DatedWear, "fragranceId">>): number {
  return new Set(wears.map((w) => w.fragranceId)).size;
}

/**
 * Most-worn fragrances, by wear count. Ties go to the fragrance worn most
 * recently, then by id, so the order is deterministic.
 */
export function mostWorn(
  wears: ReadonlyArray<Pick<DatedWear, "fragranceId" | "localDate">>,
  limit = 1,
): Array<{ fragranceId: string; wears: number; lastWorn: string }> {
  const byFragrance = new Map<string, { fragranceId: string; wears: number; lastWorn: string }>();
  for (const w of wears) {
    const row = byFragrance.get(w.fragranceId);
    if (row) {
      row.wears += 1;
      if (w.localDate > row.lastWorn) row.lastWorn = w.localDate;
    } else {
      byFragrance.set(w.fragranceId, {
        fragranceId: w.fragranceId,
        wears: 1,
        lastWorn: w.localDate,
      });
    }
  }
  return [...byFragrance.values()]
    .sort(
      (a, b) =>
        b.wears - a.wears ||
        b.lastWorn.localeCompare(a.lastWorn) ||
        a.fragranceId.localeCompare(b.fragranceId),
    )
    .slice(0, limit);
}

// ---- Accords ---------------------------------------------------------------

export type AccordWeight = { name: string; strength: number };

/**
 * Share of wears by accord. Each wear contributes a total weight of 1, split
 * across its fragrance's accords in proportion to their strength — so a
 * fragrance with many accords does not count for more than one with few.
 * Wears whose fragrance has no accords are left out of the denominator.
 *
 * `share` values sum to 1 (or the result is empty). Sorted by share, then name.
 */
export function accordBreakdown(
  wears: ReadonlyArray<Pick<DatedWear, "fragranceId">>,
  accordsByFragrance: ReadonlyMap<string, readonly AccordWeight[]>,
): Array<{ accord: string; share: number }> {
  const weight = new Map<string, number>();
  let counted = 0;
  for (const w of wears) {
    const accords = (accordsByFragrance.get(w.fragranceId) ?? []).filter((a) => a.strength > 0);
    const total = accords.reduce((s, a) => s + a.strength, 0);
    if (total === 0) continue;
    counted += 1;
    for (const a of accords) weight.set(a.name, (weight.get(a.name) ?? 0) + a.strength / total);
  }
  if (counted === 0) return [];
  return [...weight.entries()]
    .map(([accord, w]) => ({ accord, share: w / counted }))
    .sort((a, b) => b.share - a.share || a.accord.localeCompare(b.accord));
}

// ---- Untouched -------------------------------------------------------------

export type UntouchedItem<T> = {
  item: T;
  /** Local date of the most recent wear, or null if never worn. */
  lastWorn: string | null;
  /** Days since that wear, or null if never worn. */
  daysSince: number | null;
};

/**
 * Owned items not worn in `thresholdDays` or more, or never worn. Never-worn
 * items come first (in input order), then the longest-untouched.
 *
 * `lastWornByItem` maps item id → local date of its latest wear.
 */
export function untouchedItems<T extends { id: string; kind: ItemKind }>(
  items: readonly T[],
  lastWornByItem: ReadonlyMap<string, string>,
  today: string,
  thresholdDays = 30,
): Array<UntouchedItem<T>> {
  const out: Array<UntouchedItem<T>> = [];
  for (const item of items) {
    if (!isOwned(item.kind)) continue;
    const lastWorn = lastWornByItem.get(item.id) ?? null;
    if (lastWorn === null) {
      out.push({ item, lastWorn: null, daysSince: null });
      continue;
    }
    const daysSince = daysBetween(lastWorn, today);
    if (daysSince >= thresholdDays) out.push({ item, lastWorn, daysSince });
  }
  return out.sort((a, b) => {
    if (a.daysSince === null || b.daysSince === null) {
      return (a.daysSince === null ? 0 : 1) - (b.daysSince === null ? 0 : 1);
    }
    return b.daysSince - a.daysSince;
  });
}

// ---- Pick for today --------------------------------------------------------

/**
 * The least recently worn owned item. Never-worn items win; ties go to the
 * item added longest ago, then by id. Wishlist entries and items known to be
 * empty (`remainingMl === 0`) are skipped. Null when nothing qualifies.
 *
 * `lastWornAtByItem` maps item id → instant of its latest wear. Instants (not
 * local dates) so two items worn on the same day still order correctly.
 */
export function pickForToday<
  T extends { id: string; kind: ItemKind; createdAt: Date; remainingMl: number | null },
>(items: readonly T[], lastWornAtByItem: ReadonlyMap<string, Date>): T | null {
  let best: T | null = null;
  let bestWorn: number = Number.POSITIVE_INFINITY;
  for (const item of items) {
    if (!isOwned(item.kind) || item.remainingMl === 0) continue;
    // Never worn sorts as -Infinity: earlier than any real wear.
    const worn = lastWornAtByItem.get(item.id)?.getTime() ?? Number.NEGATIVE_INFINITY;
    if (
      best === null ||
      worn < bestWorn ||
      (worn === bestWorn &&
        (item.createdAt.getTime() < best.createdAt.getTime() ||
          (item.createdAt.getTime() === best.createdAt.getTime() && item.id < best.id)))
    ) {
      best = item;
      bestWorn = worn;
    }
  }
  return best;
}

// ---- Challenges ------------------------------------------------------------

/**
 * Challenge progress: distinct fragrances (or houses) among wears whose local
 * date falls in the `windowDays`-day window ending today, inclusive. A 30-day
 * window on Oct 25 covers Sep 26 – Oct 25.
 */
export function challengeProgress(
  wears: readonly DatedWear[],
  kind: ChallengeKind,
  today: string,
  windowDays = 30,
): number {
  const start = addDays(today, -(windowDays - 1));
  const seen = new Set<string>();
  for (const w of wears) {
    if (w.localDate < start || w.localDate > today) continue;
    seen.add(kind === "UNIQUE_HOUSES" ? w.brandId : w.fragranceId);
  }
  return seen.size;
}
