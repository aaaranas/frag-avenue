import "server-only";
import { cache } from "react";
import type { $Enums } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { FragranceListInput } from "./schema";
import { buildFragranceListWhere, paginationOffset, visibleToUserWhere } from "./query";
import { slugify } from "@/lib/slug";

export type FragranceListItem = {
  id: string;
  name: string;
  concentration: $Enums.Concentration;
  gender: string;
  releaseYear: number | null;
  imagePath: string | null;
  status: $Enums.CatalogStatus;
  brand: { id: string; name: string };
  accords: Array<{ strength: number; accord: { name: string } }>;
};

export type FragranceListResult = {
  items: FragranceListItem[];
  total: number;
  page: number;
  pageSize: number;
};

/** Catalogue search, limited to what `userId` may see (see `visibleToUserWhere`). */
export async function listFragrances(
  userId: string,
  input: FragranceListInput,
): Promise<FragranceListResult> {
  const where = buildFragranceListWhere(input, userId);
  const { skip, take } = paginationOffset(input);

  const [total, rows] = await prisma.$transaction([
    prisma.fragrance.count({ where }),
    prisma.fragrance.findMany({
      where,
      skip,
      take,
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        concentration: true,
        gender: true,
        releaseYear: true,
        imagePath: true,
        status: true,
        brand: { select: { id: true, name: true } },
        accords: {
          orderBy: { strength: "desc" },
          take: 3,
          select: {
            strength: true,
            accord: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return { items: rows, total, page: input.page, pageSize: input.pageSize };
}

export type FragranceDetail = Awaited<ReturnType<typeof findFragranceById>>;

/**
 * One catalogue entry, or null if it doesn't exist or `userId` may not see it.
 * Cached per request: the page's metadata and the page itself both ask.
 */
export const findFragranceById = cache((userId: string, id: string) =>
  prisma.fragrance.findFirst({
    where: { id, ...visibleToUserWhere(userId) },
    select: {
      id: true,
      name: true,
      concentration: true,
      gender: true,
      releaseYear: true,
      perfumer: true,
      imagePath: true,
      status: true,
      brand: { select: { id: true, name: true } },
      notes: {
        select: {
          layer: true,
          note: { select: { id: true, name: true } },
        },
      },
      accords: {
        orderBy: { strength: "desc" },
        select: {
          strength: true,
          accord: { select: { id: true, name: true } },
        },
      },
    },
  }),
);

export type SubmitFragranceResult =
  { kind: "created"; id: string } | { kind: "exists"; id: string } | { kind: "pending-elsewhere" };

/**
 * Creates a PENDING catalogue entry submitted by `userId`. The brand is matched
 * by slug, or created (brands are just names; a new one stays invisible until
 * one of its fragrances is approved). An existing entry with the same brand and
 * name is returned instead of duplicated — unless it is someone else's pending
 * submission, which the caller must not reveal.
 */
export async function submitFragrance(
  userId: string,
  input: { brand: string; name: string; concentration: $Enums.Concentration; releaseYear?: number },
): Promise<SubmitFragranceResult> {
  const brandSlug = slugify(input.brand);
  const slug = slugify(input.name);
  return prisma.$transaction(async (tx) => {
    const brand = await tx.brand.upsert({
      where: { slug: brandSlug },
      update: {},
      create: { name: input.brand, slug: brandSlug },
      select: { id: true },
    });
    const existing = await tx.fragrance.findUnique({
      where: { brandId_slug: { brandId: brand.id, slug } },
      select: { id: true, status: true, submittedById: true },
    });
    if (existing) {
      const visible =
        existing.status === "APPROVED" ||
        (existing.status === "PENDING" && existing.submittedById === userId);
      return visible ? { kind: "exists", id: existing.id } : { kind: "pending-elsewhere" };
    }
    const created = await tx.fragrance.create({
      data: {
        brandId: brand.id,
        slug,
        name: input.name,
        concentration: input.concentration,
        releaseYear: input.releaseYear,
        status: "PENDING",
        submittedById: userId,
      },
      select: { id: true },
    });
    return { kind: "created", id: created.id };
  });
}
