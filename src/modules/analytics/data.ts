import "server-only";
import { prisma } from "@/lib/prisma";
import {
  sumCollectionValueByCurrency,
  sumBottleVolumeMl,
  sumSprays,
  topWornFragrances,
  neglectedFragrances,
  type CollectionItemInput,
  type WearInput,
  type MoneyByCurrency,
  type NeglectedFragrance,
} from "./aggregations";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RecentWear = {
  id: string;
  wornAt: Date;
  sprays: number;
  fragranceId: string;
  fragranceName: string;
  brandName: string;
};

export type DashboardStats = {
  fragrancesOwned: number;
  collectionValue: MoneyByCurrency;
  totalVolumeMl: number;
  totalWears: number;
  totalSprays: number;
  topWorn90d: ReturnType<typeof topWornFragrances>;
  neglected: NeglectedFragrance[];
  recentWears: RecentWear[];
};

export async function getDashboardStats(userId: string, now: Date): Promise<DashboardStats> {
  const windowStart = new Date(now.getTime() - 90 * DAY_MS);

  const [items, aggr, lastWorn, wearsIn90d, recent5] = await Promise.all([
    prisma.wardrobeItem.findMany({
      where: { userId },
      select: {
        id: true,
        fragranceId: true,
        bottleSizeMl: true,
        purchasePriceMinor: true,
        currency: true,
        createdAt: true,
        fragrance: {
          select: {
            name: true,
            brand: { select: { name: true } },
          },
        },
      },
    }),
    prisma.wear.aggregate({
      where: { userId },
      _sum: { sprays: true },
      _count: { _all: true },
    }),
    prisma.wear.groupBy({
      by: ["fragranceId"],
      where: { userId },
      _max: { wornAt: true },
    }),
    prisma.wear.findMany({
      where: { userId, wornAt: { gte: windowStart } },
      select: {
        id: true,
        wornAt: true,
        sprays: true,
        fragranceId: true,
        fragrance: {
          select: {
            name: true,
            brand: { select: { name: true } },
          },
        },
      },
    }),
    prisma.wear.findMany({
      where: { userId },
      orderBy: { wornAt: "desc" },
      take: 5,
      select: {
        id: true,
        wornAt: true,
        sprays: true,
        fragranceId: true,
        fragrance: {
          select: {
            name: true,
            brand: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const itemInputs: CollectionItemInput[] = items.map((i) => ({
    id: i.id,
    fragranceId: i.fragranceId,
    fragranceName: i.fragrance.name,
    brandName: i.fragrance.brand.name,
    bottleSizeMl: i.bottleSizeMl,
    purchasePriceMinor: i.purchasePriceMinor,
    currency: i.currency,
    createdAt: i.createdAt,
  }));

  const window90: WearInput[] = wearsIn90d.map((w) => ({
    id: w.id,
    wornAt: w.wornAt,
    sprays: w.sprays,
    fragranceId: w.fragranceId,
    fragranceName: w.fragrance.name,
    brandName: w.fragrance.brand.name,
  }));

  const recentWears: RecentWear[] = recent5.map((w) => ({
    id: w.id,
    wornAt: w.wornAt,
    sprays: w.sprays,
    fragranceId: w.fragranceId,
    fragranceName: w.fragrance.name,
    brandName: w.fragrance.brand.name,
  }));

  // Distinct fragrances owned. `sumSprays` uses _sum from Prisma directly.
  const fragrancesOwned = new Set(items.map((i) => i.fragranceId)).size;

  return {
    fragrancesOwned,
    collectionValue: sumCollectionValueByCurrency(itemInputs),
    totalVolumeMl: sumBottleVolumeMl(itemInputs),
    totalWears: aggr._count._all,
    totalSprays: aggr._sum.sprays ?? sumSprays(window90), // fallback if aggregate is somehow null
    topWorn90d: topWornFragrances(window90, 3),
    neglected: neglectedFragrances(
      itemInputs,
      lastWorn.map((l) => ({ fragranceId: l.fragranceId, lastWornAt: l._max.wornAt ?? null })),
      now,
      3,
    ),
    recentWears,
  };
}
