/**
 * Who can see a wear — the single source of truth, used by every query that
 * returns wears to someone other than their owner. Pure (Prisma types only).
 *
 *   owner                      → all of their wears
 *   anyone signed in           → PUBLIC wears
 *   followers of the owner     → also FOLLOWERS wears
 *   everyone else              → never PRIVATE wears
 */
import type { Prisma } from "@prisma/client";

export type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export function canViewWear(
  wear: { userId: string; visibility: Visibility },
  viewerId: string,
  viewerFollowsOwner: boolean,
): boolean {
  if (wear.userId === viewerId) return true;
  if (wear.visibility === "PUBLIC") return true;
  return wear.visibility === "FOLLOWERS" && viewerFollowsOwner;
}

/** Prisma filter equivalent of `canViewWear`. */
export function visibleWearsWhere(viewerId: string): Prisma.WearWhereInput {
  return {
    OR: [
      { userId: viewerId },
      { visibility: "PUBLIC" },
      { visibility: "FOLLOWERS", user: { followers: { some: { followerId: viewerId } } } },
    ],
  };
}

/** The feed: the viewer's own wears plus visible wears of people they follow. */
export function feedWhere(viewerId: string): Prisma.WearWhereInput {
  return {
    AND: [
      visibleWearsWhere(viewerId),
      {
        OR: [{ userId: viewerId }, { user: { followers: { some: { followerId: viewerId } } } }],
      },
    ],
  };
}

/** One person's wears as `viewerId` may see them (a profile page). */
export function profileWearsWhere(ownerId: string, viewerId: string): Prisma.WearWhereInput {
  return { AND: [{ userId: ownerId }, visibleWearsWhere(viewerId)] };
}
