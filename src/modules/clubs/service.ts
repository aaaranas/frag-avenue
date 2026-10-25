import "server-only";
import { challengeLeaderboard, challengeStatus, type DatedWear } from "@/modules/analytics";
import { localDate } from "@/lib/time-zone";
import { findUserZone, listChallengeWears, listGlobalChallenges, type ClubDetail } from "./data";

type ChallengeWear = Awaited<ReturnType<typeof listChallengeWears>>[number];

const toDated = (w: ChallengeWear): DatedWear => ({
  // Each wear's day is its local date in the zone it was logged in.
  localDate: localDate(w.wornAt, w.timeZone),
  fragranceId: w.fragranceId,
  brandId: w.fragrance.brandId,
});

/** The user's own progress on each global challenge, over all their wears. */
export async function getMyChallengeProgress(userId: string, now: Date) {
  const [challenges, zone] = await Promise.all([listGlobalChallenges(), findUserZone(userId)]);
  if (challenges.length === 0) return [];
  const window = Math.max(...challenges.map((c) => c.windowDays));
  const wears = (await listChallengeWears(userId, [userId], window, now)).map(toDated);
  const today = localDate(now, zone?.timezone ?? "UTC");
  return challenges.map((challenge) => ({
    challenge,
    status: challengeStatus(challenge, wears, today),
  }));
}

/**
 * Each global challenge ranked across a club's members. Counts only wears the
 * viewer may see (see `listChallengeWears`), and each member's window ends on
 * their own "today".
 */
export async function getClubLeaderboards(club: ClubDetail, viewerId: string, now: Date) {
  const challenges = await listGlobalChallenges();
  if (challenges.length === 0) return [];
  const members = club.memberships.map((m) => m.user);
  const window = Math.max(...challenges.map((c) => c.windowDays));
  const wears = await listChallengeWears(
    viewerId,
    members.map((m) => m.id),
    window,
    now,
  );
  const byUser = new Map<string, DatedWear[]>();
  for (const w of wears) byUser.set(w.userId, [...(byUser.get(w.userId) ?? []), toDated(w)]);
  const participants = members.map((m) => ({
    userId: m.id,
    today: localDate(now, m.timezone),
    wears: byUser.get(m.id) ?? [],
  }));
  return challenges.map((challenge) => ({
    challenge,
    standings: challengeLeaderboard(challenge, participants),
  }));
}
