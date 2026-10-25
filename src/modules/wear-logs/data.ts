import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { WearFields } from "./schema";
import type { WeatherSnapshot } from "@/modules/weather";

/**
 * `userId` is the FIRST argument of every function in this module and is
 * included in every where clause. That is the authorization boundary. It
 * MUST come from the server session — never from a client field or URL param.
 */

const OWNED = { kind: { not: "WISHLIST" as const } };
const HOUR_MS = 60 * 60 * 1000;

/** What the log form needs about the user. */
export async function findLogDefaults(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, defaultVisibility: true, units: true },
  });
  return {
    timezone: user?.timezone ?? "UTC",
    defaultVisibility: user?.defaultVisibility ?? "FOLLOWERS",
    units: user?.units ?? "METRIC",
  };
}

/** Owned (non-wishlist) items for the "what are you wearing?" picker, with their last wear. */
export function listWearableItems(userId: string) {
  return prisma.wardrobeItem.findMany({
    where: { userId, ...OWNED },
    orderBy: [
      { fragrance: { brand: { name: "asc" } } },
      { fragrance: { name: "asc" } },
      { id: "asc" },
    ],
    select: {
      id: true,
      kind: true,
      bottleSizeMl: true,
      remainingMl: true,
      fragrance: { select: { name: true, imagePath: true, brand: { select: { name: true } } } },
      wears: { orderBy: { wornAt: "desc" }, take: 1, select: { wornAt: true } },
    },
  });
}
export type WearableItem = Awaited<ReturnType<typeof listWearableItems>>[number];

/** One owned item of the user's — the only kind that can be worn. */
export function findWearableItem(userId: string, itemId: string) {
  return prisma.wardrobeItem.findFirst({
    where: { id: itemId, userId, ...OWNED },
    select: {
      id: true,
      kind: true,
      fragranceId: true,
      bottleSizeMl: true,
      remainingMl: true,
      fragrance: { select: { name: true, imagePath: true, brand: { select: { name: true } } } },
    },
  });
}

export function createWear(
  userId: string,
  input: WearFields & {
    fragranceId: string;
    collectionItemId: string;
    timeZone: string;
    weather: WeatherSnapshot | null;
  },
) {
  const { weather, ...rest } = input;
  return prisma.wear.create({
    data: {
      userId,
      ...rest,
      temperatureC: weather?.temperatureC ?? null,
      humidityPct: weather?.humidityPct ?? null,
      weatherCondition: weather?.condition ?? null,
      weatherSource: weather ? "AUTO" : "NONE",
      weatherProvider: weather?.provider ?? null,
      weatherObservedAt: weather?.observedAt ?? null,
    },
    select: { id: true },
  });
}

const wearSummarySelect = {
  id: true,
  wornAt: true,
  timeZone: true,
  sprays: true,
  occasion: true,
  mood: true,
  visibility: true,
  temperatureC: true,
  humidityPct: true,
  fragrance: {
    select: { id: true, name: true, imagePath: true, brand: { select: { name: true } } },
  },
  collectionItem: { select: { kind: true } },
  checkIns: { select: { offsetHours: true, result: true }, orderBy: { offsetHours: "asc" } },
} satisfies Prisma.WearSelect;

export function listWearsForUser(userId: string, opts: { page: number; pageSize: number }) {
  return prisma.$transaction([
    prisma.wear.count({ where: { userId } }),
    prisma.wear.findMany({
      where: { userId },
      orderBy: [{ wornAt: "desc" }, { id: "asc" }],
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
      select: wearSummarySelect,
    }),
  ]);
}
export type WearListRow = Awaited<ReturnType<typeof listWearsForUser>>[1][number];

export function findWearForUser(userId: string, id: string) {
  return prisma.wear.findFirst({
    where: { id, userId },
    select: {
      ...wearSummarySelect,
      notes: true,
      weatherCondition: true,
      weatherSource: true,
      weatherProvider: true,
      collectionItemId: true,
    },
  });
}
export type WearDetail = NonNullable<Awaited<ReturnType<typeof findWearForUser>>>;

/** The zone a wear was logged in, or null when the wear is not the user's. */
export async function findWearTimeZoneForUser(userId: string, id: string): Promise<string | null> {
  const wear = await prisma.wear.findFirst({ where: { id, userId }, select: { timeZone: true } });
  return wear?.timeZone ?? null;
}

/** Edits only the user's own wear. Item, zone, and weather are left as logged. */
export async function updateWearForUser(
  userId: string,
  id: string,
  fields: WearFields,
): Promise<boolean> {
  const res = await prisma.wear.updateMany({ where: { id, userId }, data: fields });
  return res.count === 1;
}

export async function deleteWearForUser(userId: string, id: string): Promise<boolean> {
  const res = await prisma.wear.deleteMany({ where: { id, userId } });
  return res.count === 1;
}

/** A wear's timing and answers, for deciding whether a check-in is open. */
export function findWearForCheckIn(userId: string, wearId: string) {
  return prisma.wear.findFirst({
    where: { id: wearId, userId },
    select: { id: true, wornAt: true, checkIns: { select: { offsetHours: true, result: true } } },
  });
}

/**
 * Records a check-in. Returns false if one already exists for that offset
 * (two taps, or two tabs) — the unique constraint is the arbiter.
 */
export async function createCheckIn(
  userId: string,
  wearId: string,
  offsetHours: number,
  result: "STRONG" | "FAINT" | "GONE",
): Promise<boolean> {
  try {
    await prisma.checkIn.create({ data: { userId, wearId, offsetHours, result } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
    throw err;
  }
}

/**
 * Wears that could have a check-in open now: worn between 2 and 24 hours ago
 * (prompts open at 2h; the last closes at 24h). The caller decides which are
 * actually due with `dueCheckIn`.
 */
export function listRecentWearsForCheckIns(userId: string, now: Date) {
  return prisma.wear.findMany({
    where: {
      userId,
      wornAt: {
        gte: new Date(now.getTime() - 24 * HOUR_MS),
        lte: new Date(now.getTime() - 2 * HOUR_MS),
      },
    },
    orderBy: { wornAt: "desc" },
    select: {
      id: true,
      wornAt: true,
      fragrance: { select: { name: true, brand: { select: { name: true } } } },
      checkIns: { select: { offsetHours: true, result: true } },
    },
  });
}
