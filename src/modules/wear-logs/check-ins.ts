/**
 * Performance check-in schedule. Pure: no Prisma, no clock.
 *
 * After a wear the user is asked "how is it doing?" at 2h, 4h, and 8h, and
 * answers Strong / Faint / Gone. Prompts are derived, never stored:
 *
 *   - Each prompt opens at its offset and stays open until the next offset
 *     opens (the 8h prompt stays open until 24h). So at most one is open.
 *   - An answered prompt is closed.
 *   - Once any answer is GONE, no later prompt opens.
 *
 * A check-in may be recorded only for the prompt that is currently open.
 */

export const CHECK_IN_OFFSETS = [2, 4, 8] as const;
export type CheckInOffset = (typeof CHECK_IN_OFFSETS)[number];
export type CheckInResult = "STRONG" | "FAINT" | "GONE";
export type RecordedCheckIn = { offsetHours: number; result: CheckInResult };

const HOUR_MS = 60 * 60 * 1000;
const LAST_PROMPT_CLOSES_AT_HOURS = 24;

export function isCheckInOffset(value: number): value is CheckInOffset {
  return (CHECK_IN_OFFSETS as readonly number[]).includes(value);
}

/** The window during which the prompt for `offset` is open, in hours after the wear. */
function windowFor(offset: CheckInOffset): [opens: number, closes: number] {
  const i = CHECK_IN_OFFSETS.indexOf(offset);
  return [offset, CHECK_IN_OFFSETS[i + 1] ?? LAST_PROMPT_CLOSES_AT_HOURS];
}

/** The open prompt for a wear at `now`, or null if none is open. */
export function dueCheckIn(
  wornAt: Date,
  recorded: readonly RecordedCheckIn[],
  now: Date,
): CheckInOffset | null {
  const elapsedHours = (now.getTime() - wornAt.getTime()) / HOUR_MS;
  const offset = CHECK_IN_OFFSETS.find((o) => {
    const [opens, closes] = windowFor(o);
    return elapsedHours >= opens && elapsedHours < closes;
  });
  if (offset === undefined) return null;
  if (recorded.some((c) => c.result === "GONE" && c.offsetHours < offset)) return null;
  if (recorded.some((c) => c.offsetHours === offset)) return null;
  return offset;
}

const LABEL: Record<CheckInResult, string> = { STRONG: "Strong", FAINT: "Faint", GONE: "Gone" };

/**
 * One-line summary for a wear card, in offset order:
 * "Strong 2h · Faint 4h · Gone by 8h". Null when nothing was recorded.
 */
export function checkInSummary(recorded: readonly RecordedCheckIn[]): string | null {
  if (recorded.length === 0) return null;
  return [...recorded]
    .sort((a, b) => a.offsetHours - b.offsetHours)
    .map((c) =>
      c.result === "GONE" ? `Gone by ${c.offsetHours}h` : `${LABEL[c.result]} ${c.offsetHours}h`,
    )
    .join(" · ");
}
