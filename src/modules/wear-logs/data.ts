import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * `userId` is the FIRST argument of every function in this module and is
 * included in every where clause. That is the authorization boundary. It
 * MUST come from the server session — never from a client field or URL param.
 */

export function listWearsForUser(userId: string, opts: { page: number; pageSize: number }) {
  const skip = (opts.page - 1) * opts.pageSize;
  return prisma.$transaction([
    prisma.wear.count({ where: { userId } }),
    prisma.wear.findMany({
      where: { userId },
      orderBy: { wornAt: "desc" },
      skip,
      take: opts.pageSize,
      select: {
        id: true,
        wornAt: true,
        timeZone: true,
        sprays: true,
        occasion: true,
        environment: true,
        temperatureC: true,
        weatherCondition: true,
        enjoyment: true,
        fragrance: {
          select: {
            id: true,
            name: true,
            brand: { select: { name: true } },
          },
        },
      },
    }),
  ]);
}

export type WearListRow = Awaited<ReturnType<typeof listWearsForUser>>[1][number];

/** The signed-in user's current zone; new wears are logged in it. */
export async function findUserTimeZone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return user?.timezone ?? "UTC";
}

/** The zone a wear was logged in, or null when the wear is not the user's. */
export async function findWearTimeZoneForUser(userId: string, id: string): Promise<string | null> {
  const wear = await prisma.wear.findFirst({ where: { id, userId }, select: { timeZone: true } });
  return wear?.timeZone ?? null;
}

export function findWearForUser(userId: string, id: string) {
  return prisma.wear.findFirst({
    where: { id, userId },
    include: {
      fragrance: {
        select: {
          id: true,
          name: true,
          brand: { select: { name: true } },
        },
      },
    },
  });
}

export function findCollectionItemOwnedByUser(userId: string, collectionItemId: string) {
  return prisma.wardrobeItem.findFirst({
    where: { id: collectionItemId, userId },
    select: { id: true, fragranceId: true },
  });
}

export function fragranceExists(id: string) {
  return prisma.fragrance.findUnique({ where: { id }, select: { id: true } });
}

/**
 * Minimal picker payload: user's collection items with just the fields the
 * /wear/new picker needs to render.
 */
export function listCollectionForPicker(userId: string) {
  return prisma.wardrobeItem.findMany({
    where: { userId },
    orderBy: [{ fragrance: { brand: { name: "asc" } } }, { fragrance: { name: "asc" } }],
    select: {
      id: true,
      fragranceId: true,
      bottleSizeMl: true,
      fragrance: {
        select: {
          name: true,
          brand: { select: { name: true } },
        },
      },
    },
  });
}

type PersistenceInput = {
  fragranceId: string;
  collectionItemId: string | null;
  wornAt: Date;
  sprays: number;
  timeZone: string;
  occasion: "WORK" | "CASUAL" | "EVENING" | "FORMAL" | "SPORT" | "DATE" | "OTHER";
  environment: "INDOOR" | "OUTDOOR" | "MIXED";
  temperatureC: number | null;
  humidityPct: number | null;
  weatherCondition: string | null;
  weatherSource: "AUTO" | "MANUAL" | "NONE";
  longevityHours: number | null;
  projection: number | null;
  enjoyment: number | null;
  notes: string | null;
};

export function createWearForUser(userId: string, input: PersistenceInput) {
  return prisma.wear.create({
    data: { userId, ...input },
    select: { id: true },
  });
}

export async function updateWearForUser(
  userId: string,
  id: string,
  input: PersistenceInput,
): Promise<boolean> {
  // fragranceId, collectionItemId, and timeZone are immutable after create —
  // an edit is about performance details, not re-attributing the wear.
  const { fragranceId: _fid, collectionItemId: _cid, timeZone: _tz, ...updatable } = input;
  void _fid;
  void _cid;
  void _tz;
  const res = await prisma.wear.updateMany({
    where: { id, userId },
    data: updatable,
  });
  return res.count === 1;
}

export async function deleteWearForUser(userId: string, id: string): Promise<boolean> {
  const res = await prisma.wear.deleteMany({ where: { id, userId } });
  return res.count === 1;
}
