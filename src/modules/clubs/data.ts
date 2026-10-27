import "server-only";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { visibleWearsWhere } from "@/modules/social";
import { findUserSettings } from "@/modules/users/data";

/**
 * Clubs and challenge data. `viewerId` / `userId` come from the server
 * session. Other people's wears are read only through `visibleWearsWhere`, so
 * a leaderboard never counts a wear the viewer is not allowed to see.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function listGlobalChallenges() {
  return prisma.challenge.findMany({
    where: { clubId: null },
    orderBy: [{ target: "desc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      kind: true,
      target: true,
      windowDays: true,
    },
  });
}

/**
 * Wears for challenge progress: those of `userIds` that `viewerId` may see,
 * from far enough back to cover any window in any zone (window + 2 days).
 */
export function listChallengeWears(
  viewerId: string,
  userIds: readonly string[],
  windowDays: number,
  now: Date,
) {
  return prisma.wear.findMany({
    where: {
      AND: [
        { userId: { in: [...userIds] } },
        { wornAt: { gte: new Date(now.getTime() - (windowDays + 2) * DAY_MS) } },
        visibleWearsWhere(viewerId),
      ],
    },
    select: {
      userId: true,
      wornAt: true,
      timeZone: true,
      fragranceId: true,
      fragrance: { select: { brandId: true } },
    },
  });
}

/** Shares the request's one read of the user's settings (the shell layout reads it too). */
export async function findUserZone(userId: string) {
  const user = await findUserSettings(userId);
  return user ? { timezone: user.timezone } : null;
}

export function listClubs(viewerId: string) {
  return prisma.club.findMany({
    orderBy: [{ memberships: { _count: "desc" } }, { name: "asc" }],
    take: 50,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      _count: { select: { memberships: true } },
      memberships: { where: { userId: viewerId }, select: { userId: true } },
    },
  });
}
export type ClubListItem = Awaited<ReturnType<typeof listClubs>>[number];

export function findClubBySlug(slug: string, viewerId: string) {
  return prisma.club
    .findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        createdAt: true,
        memberships: {
          orderBy: { joinedAt: "asc" },
          select: {
            role: true,
            user: { select: { id: true, username: true, name: true, image: true, timezone: true } },
          },
        },
      },
    })
    .then((club) =>
      club ? { ...club, isMember: club.memberships.some((m) => m.user.id === viewerId) } : null,
    );
}
export type ClubDetail = NonNullable<Awaited<ReturnType<typeof findClubBySlug>>>;

/** Creates a club with its creator as admin. "taken" if the name's slug exists. */
export async function createClub(
  userId: string,
  input: { name: string; description?: string },
): Promise<{ slug: string } | "taken"> {
  const slug = slugify(input.name);
  return prisma.$transaction(async (tx) => {
    if (await tx.club.findUnique({ where: { slug }, select: { id: true } }))
      return "taken" as const;
    await tx.club.create({
      data: {
        slug,
        name: input.name,
        description: input.description ?? null,
        createdById: userId,
        memberships: { create: { userId, role: "ADMIN" } },
      },
    });
    return { slug };
  });
}

export function findClubForMembership(clubId: string) {
  return prisma.club.findUnique({ where: { id: clubId }, select: { id: true, slug: true } });
}

export async function joinClub(userId: string, clubId: string): Promise<void> {
  await prisma.clubMembership.createMany({ data: [{ userId, clubId }], skipDuplicates: true });
}

export async function leaveClub(userId: string, clubId: string): Promise<void> {
  await prisma.clubMembership.deleteMany({ where: { userId, clubId } });
}
