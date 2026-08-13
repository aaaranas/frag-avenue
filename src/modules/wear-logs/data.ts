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
    prisma.wearLog.count({ where: { userId } }),
    prisma.wearLog.findMany({
      where: { userId },
      orderBy: { wornAt: "desc" },
      skip,
      take: opts.pageSize,
      select: {
        id: true,
        wornAt: true,
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

export function findWearForUser(userId: string, id: string) {
  return prisma.wearLog.findFirst({
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
  return prisma.collectionItem.findFirst({
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
  return prisma.collectionItem.findMany({
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
  return prisma.wearLog.create({
    data: { userId, ...input },
    select: { id: true },
  });
}

export async function updateWearForUser(
  userId: string,
  id: string,
  input: PersistenceInput,
): Promise<boolean> {
  // fragranceId and collectionItemId are immutable after create — an edit is
  // about performance details, not re-attributing the wear.
  const { fragranceId: _fid, collectionItemId: _cid, ...updatable } = input;
  void _fid;
  void _cid;
  const res = await prisma.wearLog.updateMany({
    where: { id, userId },
    data: updatable,
  });
  return res.count === 1;
}

export async function deleteWearForUser(userId: string, id: string): Promise<boolean> {
  const res = await prisma.wearLog.deleteMany({ where: { id, userId } });
  return res.count === 1;
}
