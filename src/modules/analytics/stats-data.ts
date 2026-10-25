import "server-only";
import { prisma } from "@/lib/prisma";
import { buildStats, type StatRange } from "./stats";
import type { AccordWeight } from "./wear-stats";

/**
 * Loads everything the Stats screen needs for `userId` and runs `buildStats`.
 * Owner-only: every query is scoped to `userId`, which MUST come from the
 * server session.
 */
export async function getStatsForUser(userId: string, range: StatRange, now: Date) {
  const [user, wears, items] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true, units: true } }),
    prisma.wear.findMany({
      where: { userId },
      select: {
        wornAt: true,
        timeZone: true,
        fragranceId: true,
        collectionItemId: true,
        temperatureC: true,
        fragrance: { select: { brandId: true } },
        _count: { select: { checkIns: true } },
      },
    }),
    prisma.wardrobeItem.findMany({
      where: { userId, kind: { not: "WISHLIST" } },
      select: { id: true, kind: true, fragranceId: true },
    }),
  ]);

  const fragranceIds = [
    ...new Set([...wears.map((w) => w.fragranceId), ...items.map((i) => i.fragranceId)]),
  ];
  const fragrances = await prisma.fragrance.findMany({
    where: { id: { in: fragranceIds } },
    select: {
      id: true,
      name: true,
      imagePath: true,
      brand: { select: { name: true } },
      accords: { select: { strength: true, accord: { select: { name: true } } } },
    },
  });

  const accordsByFragrance = new Map<string, AccordWeight[]>(
    fragrances.map((f) => [
      f.id,
      f.accords.map((a) => ({ name: a.accord.name, strength: a.strength })),
    ]),
  );
  const timeZone = user?.timezone ?? "UTC";

  const stats = buildStats({
    wears: wears.map((w) => ({
      wornAt: w.wornAt,
      timeZone: w.timeZone,
      fragranceId: w.fragranceId,
      brandId: w.fragrance.brandId,
      collectionItemId: w.collectionItemId,
      hasWeather: w.temperatureC !== null,
      hasCheckIn: w._count.checkIns > 0,
    })),
    items,
    accordsByFragrance,
    now,
    timeZone,
    range,
  });

  return {
    stats,
    units: user?.units ?? "METRIC",
    fragrances: new Map(
      fragrances.map((f) => [f.id, { name: f.name, brand: f.brand.name, imagePath: f.imagePath }]),
    ),
  };
}
