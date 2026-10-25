import "server-only";
import { prisma } from "@/lib/prisma";
import type { ItemKind, WardrobePersistenceInput } from "./schema";

/**
 * `userId` is the FIRST argument of every function here and is part of every
 * where clause — the authorization boundary. It MUST come from the server
 * session, never from a client field or URL parameter.
 */

/** Catalogue rows a user may reference: approved, or their own pending submission. */
export const visibleToUser = (userId: string) => ({
  OR: [{ status: "APPROVED" as const }, { status: "PENDING" as const, submittedById: userId }],
});

export function listWardrobeForUser(userId: string, kind?: ItemKind) {
  return prisma.wardrobeItem.findMany({
    where: { userId, ...(kind ? { kind } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      kind: true,
      bottleSizeMl: true,
      remainingMl: true,
      purchasePriceMinor: true,
      currency: true,
      createdAt: true,
      // Wears logged from this item — the basis for cost per wear.
      _count: { select: { wears: true } },
      fragrance: {
        select: {
          id: true,
          name: true,
          concentration: true,
          imagePath: true,
          status: true,
          brand: { select: { name: true } },
        },
      },
    },
  });
}

export type WardrobeListItem = Awaited<ReturnType<typeof listWardrobeForUser>>[number];

/** Item counts per kind, for the filter tabs. Kinds with no items are absent. */
export async function countWardrobeByKind(
  userId: string,
): Promise<Partial<Record<ItemKind, number>>> {
  const rows = await prisma.wardrobeItem.groupBy({
    by: ["kind"],
    where: { userId },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.kind, r._count._all]));
}

export function findWardrobeItemForUser(userId: string, id: string) {
  return prisma.wardrobeItem.findFirst({
    where: { id, userId },
    select: {
      id: true,
      kind: true,
      bottleSizeMl: true,
      remainingMl: true,
      purchasePriceMinor: true,
      currency: true,
      purchaseDate: true,
      personalNotes: true,
      _count: { select: { wears: true } },
      fragrance: {
        select: { id: true, name: true, imagePath: true, brand: { select: { name: true } } },
      },
    },
  });
}

export type WardrobeItemDetail = NonNullable<Awaited<ReturnType<typeof findWardrobeItemForUser>>>;

/** A catalogue fragrance this user may add to their wardrobe, or null. */
export function findAddableFragrance(userId: string, fragranceId: string) {
  return prisma.fragrance.findFirst({
    where: { id: fragranceId, ...visibleToUser(userId) },
    select: { id: true },
  });
}

export function createWardrobeItem(userId: string, input: WardrobePersistenceInput) {
  return prisma.wardrobeItem.create({ data: { userId, ...input }, select: { id: true } });
}

/** Updates only the user's own item; returns whether it matched. fragranceId is immutable. */
export async function updateWardrobeItemForUser(
  userId: string,
  id: string,
  input: WardrobePersistenceInput,
): Promise<boolean> {
  const { fragranceId: _fid, ...updatable } = input;
  void _fid;
  const res = await prisma.wardrobeItem.updateMany({ where: { id, userId }, data: updatable });
  return res.count === 1;
}

/**
 * Deletes the user's own item. Its wears are kept (they reference the
 * fragrance too); the link to the item is cleared by `onDelete: SetNull`.
 */
export async function deleteWardrobeItemForUser(userId: string, id: string): Promise<boolean> {
  const res = await prisma.wardrobeItem.deleteMany({ where: { id, userId } });
  return res.count === 1;
}
