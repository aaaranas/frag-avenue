import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pickForToday } from "@/modules/analytics";
import { feedWhere, profileWearsWhere, visibleWearsWhere } from "./visibility";

/**
 * Social reads and writes. `viewerId` / `userId` always come from the server
 * session. Every read of someone else's wear goes through the visibility
 * where-builders in ./visibility.
 */

export const PAGE_SIZE = 20;

function cardSelect(viewerId: string) {
  return {
    id: true,
    userId: true,
    wornAt: true,
    timeZone: true,
    sprays: true,
    occasion: true,
    mood: true,
    visibility: true,
    temperatureC: true,
    user: { select: { id: true, username: true, name: true, image: true } },
    fragrance: {
      select: { id: true, name: true, imagePath: true, brand: { select: { name: true } } },
    },
    collectionItem: { select: { kind: true } },
    checkIns: { select: { offsetHours: true, result: true } },
    _count: { select: { kudos: true, comments: { where: { deletedAt: null } } } },
    // Empty unless the viewer gave kudos.
    kudos: { where: { userId: viewerId }, select: { userId: true } },
  } satisfies Prisma.WearSelect;
}

export type WearCardData = Prisma.WearGetPayload<{ select: ReturnType<typeof cardSelect> }>;

async function page(where: Prisma.WearWhereInput, viewerId: string, cursor?: string) {
  const rows = await prisma.wear.findMany({
    where,
    orderBy: [{ wornAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: cardSelect(viewerId),
  });
  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}

export function listFeed(viewerId: string, cursor?: string) {
  return page(feedWhere(viewerId), viewerId, cursor);
}

export function listProfileWears(ownerId: string, viewerId: string, cursor?: string) {
  return page(profileWearsWhere(ownerId, viewerId), viewerId, cursor);
}

/** A wear with its social details, or null if the viewer may not see it. */
export function findVisibleWear(viewerId: string, wearId: string) {
  return prisma.wear.findFirst({
    where: { AND: [{ id: wearId }, visibleWearsWhere(viewerId)] },
    select: {
      ...cardSelect(viewerId),
      notes: true,
      humidityPct: true,
      weatherCondition: true,
      weatherProvider: true,
      comments: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          body: true,
          createdAt: true,
          userId: true,
          user: { select: { username: true, name: true, image: true } },
        },
      },
    },
  });
}
export type VisibleWear = NonNullable<Awaited<ReturnType<typeof findVisibleWear>>>;

/** Owner and id of a wear the viewer may see — the authorization check for kudos and comments. */
export function findWearForInteraction(viewerId: string, wearId: string) {
  return prisma.wear.findFirst({
    where: { AND: [{ id: wearId }, visibleWearsWhere(viewerId)] },
    select: { id: true, userId: true },
  });
}

/** Gives or takes back kudos. Returns whether the viewer now has kudos on the wear. */
export async function toggleKudos(viewerId: string, wearId: string): Promise<boolean> {
  const removed = await prisma.kudos.deleteMany({ where: { wearId, userId: viewerId } });
  if (removed.count > 0) return false;
  try {
    await prisma.kudos.create({ data: { wearId, userId: viewerId } });
  } catch (err) {
    // A concurrent toggle already created it: the end state is "given".
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }
  return true;
}

export function createComment(viewerId: string, wearId: string, body: string) {
  return prisma.comment.create({ data: { wearId, userId: viewerId, body }, select: { id: true } });
}

/**
 * Soft-deletes a comment if the viewer wrote it or owns the wear it is on.
 * Returns whether anything was deleted.
 */
export async function deleteComment(viewerId: string, commentId: string): Promise<boolean> {
  const res = await prisma.comment.updateMany({
    where: {
      id: commentId,
      deletedAt: null,
      OR: [{ userId: viewerId }, { wear: { userId: viewerId } }],
    },
    data: { deletedAt: new Date(), body: "" },
  });
  return res.count === 1;
}

export function findProfileByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      bio: true,
      _count: { select: { followers: true, following: true } },
    },
  });
}

export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  const row = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId, followeeId } },
    select: { followerId: true },
  });
  return row !== null;
}

/** A user who can be followed: exists and has a username. */
export function findFollowable(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, username: { not: null } },
    select: { id: true, username: true },
  });
}

export async function follow(followerId: string, followeeId: string): Promise<void> {
  await prisma.follow.createMany({ data: [{ followerId, followeeId }], skipDuplicates: true });
}

export async function unfollow(followerId: string, followeeId: string): Promise<void> {
  await prisma.follow.deleteMany({ where: { followerId, followeeId } });
}

/** People search by username prefix or name, for finding someone to follow. */
export function searchPeople(viewerId: string, q: string | undefined) {
  return prisma.user.findMany({
    where: {
      id: { not: viewerId },
      username: { not: null },
      ...(q
        ? {
            OR: [
              { username: { startsWith: q.toLowerCase() } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ followers: { _count: "desc" } }, { username: "asc" }],
    take: 30,
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      _count: { select: { followers: true } },
      followers: { where: { followerId: viewerId }, select: { followerId: true } },
    },
  });
}

/**
 * "Pick for today": the least recently worn owned item (see `pickForToday`),
 * with when it was last worn.
 */
export async function findPickForToday(userId: string) {
  const [items, last] = await Promise.all([
    prisma.wardrobeItem.findMany({
      where: { userId, kind: { not: "WISHLIST" } },
      select: {
        id: true,
        kind: true,
        createdAt: true,
        remainingMl: true,
        bottleSizeMl: true,
        fragrance: { select: { name: true, imagePath: true, brand: { select: { name: true } } } },
      },
    }),
    prisma.wear.groupBy({
      by: ["collectionItemId"],
      where: { userId, collectionItemId: { not: null } },
      _max: { wornAt: true },
    }),
  ]);
  const lastWorn = new Map<string, Date>();
  for (const row of last) {
    if (row.collectionItemId && row._max.wornAt)
      lastWorn.set(row.collectionItemId, row._max.wornAt);
  }
  const pick = pickForToday(items, lastWorn);
  return pick ? { item: pick, lastWornAt: lastWorn.get(pick.id) ?? null } : null;
}
