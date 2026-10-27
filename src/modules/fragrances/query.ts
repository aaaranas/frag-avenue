import type { Prisma } from "@prisma/client";
import type { FragranceListInput } from "./schema";

/**
 * Catalogue rows `userId` may see: approved entries, plus their own pending
 * submissions. Other users' pending or rejected entries never show.
 */
export function visibleToUserWhere(userId: string): Prisma.FragranceWhereInput {
  return {
    OR: [{ status: "APPROVED" }, { status: "PENDING", submittedById: userId }],
  };
}

/** The same rule as `visibleToUserWhere`, for a row already loaded: may `userId` open its page? */
export function isVisibleToUser(
  fragrance: { status: "APPROVED" | "PENDING" | "REJECTED"; submittedById: string | null },
  userId: string,
): boolean {
  return (
    fragrance.status === "APPROVED" ||
    (fragrance.status === "PENDING" && fragrance.submittedById === userId)
  );
}

/**
 * Pure query-shape builder. Takes normalized input, returns a Prisma
 * `where` clause. Lives in its own file so it can be unit-tested without
 * touching Prisma or the database.
 */
export function buildFragranceListWhere(
  input: FragranceListInput,
  userId: string,
): Prisma.FragranceWhereInput {
  const visible = visibleToUserWhere(userId);
  const q = input.q;
  if (!q) return visible;
  return {
    AND: [
      visible,
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { is: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
    ],
  };
}

export function paginationOffset(input: FragranceListInput): { skip: number; take: number } {
  return {
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
  };
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}
