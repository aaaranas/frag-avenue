/**
 * Time-zone helpers. Pure, dependency-free (built on `Intl`), safe on the server
 * and in the browser.
 *
 * Conventions:
 *   - Instants are `Date` (UTC). They are what the database stores.
 *   - A "local date" is a `YYYY-MM-DD` string in some IANA zone. It is what
 *     streaks, challenges, and "untouched" count in. ISO date strings sort and
 *     compare correctly as plain strings.
 *   - A "wall time" is `YYYY-MM-DDTHH:mm` in some IANA zone — the value of an
 *     `<input type="datetime-local">`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

type WallParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function wallParts(instant: Date, timeZone: string): WallParts {
  const out: Record<string, number> = {};
  for (const p of formatterFor(timeZone).formatToParts(instant)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year!,
    month: out.month!,
    day: out.day!,
    hour: out.hour!,
    minute: out.minute!,
    second: out.second!,
  };
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** True when `Intl` recognises `value` as a time zone (IANA name or alias). */
export function isValidTimeZone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The local calendar date of `instant` in `timeZone`, as `YYYY-MM-DD`. */
export function localDate(instant: Date, timeZone: string): string {
  const p = wallParts(instant, timeZone);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** The wall-clock time of `instant` in `timeZone`, as `YYYY-MM-DDTHH:mm`. */
export function wallTime(instant: Date, timeZone: string): string {
  const p = wallParts(instant, timeZone);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Milliseconds `timeZone` is ahead of UTC at `instant` (e.g. +8h for Manila). */
function offsetMs(instant: Date, timeZone: string): number {
  const p = wallParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** True for a well-formed `YYYY-MM-DDTHH:mm` string naming a real calendar time. */
export function isWallTime(value: string): boolean {
  const m = WALL_TIME.exec(value);
  if (!m) return false;
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number];
  const probe = new Date(Date.UTC(y, mo - 1, d, h, mi));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === mo - 1 &&
    probe.getUTCDate() === d &&
    h < 24 &&
    mi < 60
  );
}

/**
 * The UTC instant at which the clocks in `timeZone` read `wall`.
 *
 * DST edge cases resolve the way most calendars do: a wall time skipped by a
 * spring-forward gap maps to the instant one gap-length later (02:30 → 03:30),
 * and an ambiguous fall-back time maps to its first (earlier) occurrence.
 *
 * Throws on a malformed wall time — validate with `isWallTime` first.
 */
export function zonedWallTimeToUtc(wall: string, timeZone: string): Date {
  if (!isWallTime(wall)) throw new Error(`Invalid wall time: ${wall}`);
  const [, y, mo, d, h, mi] = WALL_TIME.exec(wall)!.map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // The offset either side of the wall time; they differ only near a transition.
  const before = offsetMs(new Date(asUtc - DAY_MS), timeZone);
  const after = offsetMs(new Date(asUtc + DAY_MS), timeZone);
  const viaBefore = asUtc - before;
  if (before === after) return new Date(viaBefore);
  // Near a transition: prefer the earlier candidate that round-trips.
  const viaAfter = asUtc - after;
  const candidates = [viaBefore, viaAfter].sort((a, b) => a - b);
  for (const c of candidates) {
    if (wallTime(new Date(c), timeZone) === wall) return new Date(c);
  }
  // Skipped by a spring-forward gap: no candidate round-trips. Using the
  // pre-transition offset lands one gap-length after the requested time.
  return new Date(viaBefore);
}

function parseDate(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** `date` (YYYY-MM-DD) shifted by `days` calendar days. */
export function addDays(date: string, days: number): string {
  const t = new Date(parseDate(date) + days * DAY_MS);
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to) - parseDate(from)) / DAY_MS);
}
