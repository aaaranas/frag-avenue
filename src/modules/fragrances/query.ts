import type { Prisma } from "@prisma/client";
import type { FragranceListInput } from "./schema";

/**
 * Pure query-shape builder. Takes normalized input, returns a Prisma
 * `where` clause. Lives in its own file so it can be unit-tested without
 * touching Prisma or the database.
 */
export function buildFragranceListWhere(input: FragranceListInput): Prisma.FragranceWhereInput {
  const q = input.q;
  if (!q) return {};
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { brand: { is: { name: { contains: q, mode: "insensitive" } } } },
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
