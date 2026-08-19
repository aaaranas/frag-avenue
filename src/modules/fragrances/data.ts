import "server-only";
import type { $Enums } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { FragranceListInput } from "./schema";
import { buildFragranceListWhere, paginationOffset } from "./query";

export type FragranceListItem = {
  id: string;
  name: string;
  concentration: $Enums.Concentration;
  gender: string;
  releaseYear: number | null;
  bottleShape: $Enums.BottleShape | null;
  glassColor: string | null;
  capColor: string | null;
  glassFinish: $Enums.GlassFinish | null;
  brand: { id: string; name: string };
  accords: Array<{ strength: number; accord: { name: string } }>;
};

export type FragranceListResult = {
  items: FragranceListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listFragrances(input: FragranceListInput): Promise<FragranceListResult> {
  const where = buildFragranceListWhere(input);
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
        bottleShape: true,
        glassColor: true,
        capColor: true,
        glassFinish: true,
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

export async function findFragranceById(id: string) {
  return prisma.fragrance.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      concentration: true,
      gender: true,
      releaseYear: true,
      perfumer: true,
      bottleShape: true,
      glassColor: true,
      capColor: true,
      glassFinish: true,
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
  });
}
