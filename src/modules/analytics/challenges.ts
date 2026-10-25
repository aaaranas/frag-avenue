/**
 * Challenge progress and leaderboards. Pure: callers pass each participant's
 * wears (as local dates) and their own "today".
 */
import { challengeProgress, type ChallengeKind, type DatedWear } from "./wear-stats";

export type ChallengeDef = {
  id: string;
  title: string;
  kind: ChallengeKind;
  target: number;
  windowDays: number;
};

export type ChallengeStatus = {
  count: number;
  target: number;
  complete: boolean;
  /** 0..1, capped at 1. */
  fraction: number;
};

export function challengeStatus(
  def: ChallengeDef,
  wears: readonly DatedWear[],
  today: string,
): ChallengeStatus {
  const count = challengeProgress(wears, def.kind, today, def.windowDays);
  return {
    count,
    target: def.target,
    complete: count >= def.target,
    fraction: def.target > 0 ? Math.min(1, count / def.target) : 0,
  };
}

export type Standing = { userId: string; rank: number } & ChallengeStatus;

/**
 * Participants ranked by progress, highest first. Equal counts share a rank
 * (1, 2, 2, 4); ties are listed by user id so the order is stable.
 */
export function challengeLeaderboard(
  def: ChallengeDef,
  participants: ReadonlyArray<{ userId: string; today: string; wears: readonly DatedWear[] }>,
): Standing[] {
  const rows = participants
    .map((p) => ({ userId: p.userId, ...challengeStatus(def, p.wears, p.today) }))
    .sort((a, b) => b.count - a.count || a.userId.localeCompare(b.userId));
  const out: Standing[] = [];
  for (const [i, r] of rows.entries()) {
    const prev = out[i - 1];
    out.push({ ...r, rank: prev && prev.count === r.count ? prev.rank : i + 1 });
  }
  return out;
}
