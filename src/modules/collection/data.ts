import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Every function in this file takes `userId` as its FIRST argument and includes
 * it in the where clause. That is not decoration — it is the authorization
 * boundary. `userId` MUST come from the server session, never from a client
 * field or URL parameter. See `src/modules/auth/session.ts`.
 */

export function listCollectionForUser(userId: string) {
  return prisma.collectionItem.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      bottleSizeMl: true,
      remainingMl: true,
      purchasePriceMinor: true,
      currency: true,
      condition: true,
      personalRating: true,
      createdAt: true,
      fragrance: {
        select: {
          id: true,
          name: true,
          concentration: true,
          brand: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export type CollectionListItem = Awaited<ReturnType<typeof listCollectionForUser>>[number];

export function findCollectionItemForUser(userId: string, id: string) {
  return prisma.collectionItem.findFirst({
    where: { id, userId },
    include: {
      fragrance: {
        select: {
          id: true,
          name: true,
          brand: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export type CollectionItemDetail = Awaited<ReturnType<typeof findCollectionItemForUser>>;

/**
 * Verifies the fragrance exists before we allow a create — the schema restricts
 * fragranceId as an FK, but Prisma's error surface is ugly, so we probe first.
 */
export function findFragrancePreview(id: string) {
  return prisma.fragrance.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      brand: { select: { name: true } },
    },
  });
}

type PersistenceInput = {
  fragranceId: string;
  bottleSizeMl: number;
  remainingMl: number | null;
  purchasePriceMinor: number | null;
  currency: string | null;
  purchaseDate: Date | null;
  purchaseSource: string | null;
  batchCode: string | null;
  condition: "NEW" | "USED" | "DECANT";
  personalRating: number | null;
  personalNotes: string | null;
};

export function createCollectionItem(userId: string, input: PersistenceInput) {
  return prisma.collectionItem.create({
    data: { userId, ...input },
    select: { id: true },
  });
}

/**
 * Updates only if the item belongs to `userId`. Uses `updateMany` because
 * `update` cannot filter by two columns; `count` tells us whether authorization
 * matched. Returns whether the item was found+owned.
 */
export async function updateCollectionItemForUser(
  userId: string,
  id: string,
  input: PersistenceInput,
): Promise<boolean> {
  const { fragranceId: _ignore, ...updatable } = input;
  void _ignore; // fragranceId is immutable after create
  const res = await prisma.collectionItem.updateMany({
    where: { id, userId },
    data: updatable,
  });
  return res.count === 1;
}

export async function deleteCollectionItemForUser(userId: string, id: string): Promise<boolean> {
  const res = await prisma.collectionItem.deleteMany({ where: { id, userId } });
  return res.count === 1;
}
