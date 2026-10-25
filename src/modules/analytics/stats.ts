/**
 * The Stats screen, as one pure function of the user's wears and wardrobe.
 * No Prisma, no clock: `now` and the user's zone are arguments.
 *
 * Range ("last 30 days" etc.) applies to totals, most worn, and accords. The
 * streak and "untouched" are about now, so they always use all wears.
 */
import { addDays, localDate } from "@/lib/time-zone";
import {
  accordBreakdown,
  currentStreak,
  mostWorn,
  uniqueScents,
  untouchedItems,
  type AccordWeight,
  type DatedWear,
  type ItemKind,
} from "./wear-stats";

export const STAT_RANGES = ["30d", "90d", "all"] as const;
export type StatRange = (typeof STAT_RANGES)[number];
export const RANGE_DAYS: Record<StatRange, number | null> = { "30d": 30, "90d": 90, all: null };

export type StatsWear = {
  wornAt: Date;
  /** Zone the wear was logged in; its day is its local date there. */
  timeZone: string;
  fragranceId: string;
  brandId: string;
  collectionItemId: string | null;
  /** For the performance-vs-weather placeholder. */
  hasWeather: boolean;
  hasCheckIn: boolean;
};

export type StatsItem = { id: string; kind: ItemKind; fragranceId: string };

export type Stats = {
  range: StatRange;
  totalWears: number;
  uniqueScents: number;
  streakDays: number;
  mostWorn: Array<{ fragranceId: string; wears: number; lastWorn: string }>;
  accords: Array<{ accord: string; share: number }>;
  untouched: Array<{
    itemId: string;
    fragranceId: string;
    kind: ItemKind;
    daysSince: number | null;
  }>;
  /** Wears that have both a weather snapshot and at least one check-in. */
  weatherPerformancePoints: number;
};

/** How many such wears the performance-vs-weather chart waits for. */
export const WEATHER_CHART_MIN_POINTS = 10;

export function buildStats(input: {
  wears: readonly StatsWear[];
  items: readonly StatsItem[];
  accordsByFragrance: ReadonlyMap<string, readonly AccordWeight[]>;
  now: Date;
  /** The user's current zone: defines "today". */
  timeZone: string;
  range: StatRange;
  mostWornLimit?: number;
}): Stats {
  const today = localDate(input.now, input.timeZone);
  const dated = input.wears.map((w) => ({
    ...w,
    localDate: localDate(w.wornAt, w.timeZone),
  }));

  const days = RANGE_DAYS[input.range];
  const start = days === null ? null : addDays(today, -(days - 1));
  const inRange: Array<DatedWear & (typeof dated)[number]> = dated.filter(
    (w) => (start === null || w.localDate >= start) && w.localDate <= today,
  );

  // Latest local wear date per wardrobe item, over all time.
  const lastWornByItem = new Map<string, string>();
  for (const w of dated) {
    if (!w.collectionItemId) continue;
    const prev = lastWornByItem.get(w.collectionItemId);
    if (!prev || w.localDate > prev) lastWornByItem.set(w.collectionItemId, w.localDate);
  }

  return {
    range: input.range,
    totalWears: inRange.length,
    uniqueScents: uniqueScents(inRange),
    streakDays: currentStreak(
      dated.map((w) => w.localDate),
      today,
    ),
    mostWorn: mostWorn(inRange, input.mostWornLimit ?? 5),
    accords: accordBreakdown(inRange, input.accordsByFragrance),
    untouched: untouchedItems(input.items, lastWornByItem, today).map((u) => ({
      itemId: u.item.id,
      fragranceId: u.item.fragranceId,
      kind: u.item.kind,
      daysSince: u.daysSince,
    })),
    weatherPerformancePoints: dated.filter((w) => w.hasWeather && w.hasCheckIn).length,
  };
}
