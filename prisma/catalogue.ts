/**
 * Applies the catalogue to a database: the curated spreadsheet
 * (prisma/data/catalogue.csv) and, if one has been fetched, the Wikidata
 * snapshot. Used by `pnpm db:seed` and by `pnpm catalog:apply`, which the
 * Vercel build runs after migrations, so pushing a CSV change updates
 * production.
 *
 * Safe to run any number of times:
 *   - the whole CSV is validated before anything is written;
 *   - CSV rows are created or brought in line (fields, notes, accords,
 *     APPROVED); rows the CSV doesn't list are never touched;
 *   - Wikidata rows are create-only;
 *   - nothing is ever deleted (wardrobe items and wears point at the rows).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/slug";
import { catalogueKey, parseCatalogue } from "../src/modules/fragrances/catalogue-csv";
import {
  accordLinks,
  desiredFields,
  noteLinks,
  planCatalogue,
  type DesiredFragrance,
  type ExistingFragrance,
} from "../src/modules/fragrances/catalogue-plan";
import { WikidataSnapshot } from "../src/modules/fragrances/wikidata";

export const CATALOGUE_CSV = "prisma/data/catalogue.csv";
export const WIKIDATA_SNAPSHOT = "prisma/data/wikidata-catalogue.json";

/** Where `pnpm catalog:image` puts a fragrance's cutout, as served. */
export function photoPath(houseSlug: string, slug: string): string {
  return `/catalog/${houseSlug}-${slug}.webp`;
}

/**
 * Corrections for rows earlier seeds created under the wrong house. A
 * fragrance is MOVED (same id), never recreated, so wardrobe items and wears
 * that point at it — including real users' — keep pointing at it.
 */
export const CATALOGUE_MOVES: Array<{ slug: string; fromBrand: string; toBrand: string }> = [
  // Hawas Ice is made by Rasasi; "Hawas" is the line, not the house.
  { slug: "hawas-ice", fromBrand: "Hawas", toBrand: "Rasasi" },
];

/** Reads and validates the CSV, attaching each row's photo if its file exists. Throws on any problem. */
export function readCatalogue(path = CATALOGUE_CSV): DesiredFragrance[] {
  const { entries, errors } = parseCatalogue(readFileSync(path, "utf8"));
  if (errors.length > 0) {
    throw new Error(
      `${path} has ${errors.length} problem${errors.length === 1 ? "" : "s"}; nothing was written:\n  ` +
        errors.join("\n  "),
    );
  }
  return entries.map((e) => {
    const photo = photoPath(e.houseSlug, e.slug);
    return { ...e, imagePath: existsSync(join("public", photo)) ? photo : null };
  });
}

export type CatalogueSummary = {
  rows: number;
  created: number;
  updated: number;
  unchanged: number;
  moved: number;
  wikidata: { created: number; total: number } | null;
};

export function describeSummary(s: CatalogueSummary): string {
  const lines = [
    `Catalogue (${s.rows} rows): ${s.created} added, ${s.updated} updated, ${s.unchanged} unchanged.`,
  ];
  if (s.moved > 0)
    lines.push(`Moved ${s.moved} fragrance${s.moved === 1 ? "" : "s"} to the right house.`);
  lines.push(
    s.wikidata
      ? `Wikidata: ${s.wikidata.created} added of ${s.wikidata.total}.`
      : `Wikidata: no snapshot (${WIKIDATA_SNAPSHOT}).`,
  );
  return lines.join("\n");
}

/** Slug → first spelling seen, skipping names that slug to nothing. */
function firstBySlug(names: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const name of names) {
    const slug = slugify(name);
    if (slug && !out.has(slug)) out.set(slug, name);
  }
  return out;
}

const CHUNK = 1000;
async function inChunks<T>(items: T[], run: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < items.length; i += CHUNK) await run(items.slice(i, i + CHUNK));
}

function missingOrThrow(kind: string, wanted: Iterable<string>, found: Map<string, string>) {
  const missing = [...wanted].filter((slug) => !found.has(slug));
  if (missing.length > 0) {
    // Only possible when an existing row has the same name under another slug.
    throw new Error(
      `Could not create ${kind}: ${missing.join(", ")} (a name is taken by another row).`,
    );
  }
}

async function applyMoves(prisma: PrismaClient): Promise<number> {
  let moved = 0;
  for (const m of CATALOGUE_MOVES) {
    const from = await prisma.brand.findUnique({ where: { slug: slugify(m.fromBrand) } });
    if (!from) continue;
    const fragrance = await prisma.fragrance.findUnique({
      where: { brandId_slug: { brandId: from.id, slug: m.slug } },
      select: { id: true },
    });
    if (!fragrance) continue;
    const toSlug = slugify(m.toBrand);
    const to = await prisma.brand.upsert({
      where: { slug: toSlug },
      update: {},
      create: { name: m.toBrand, slug: toSlug },
    });
    const clash = await prisma.fragrance.findUnique({
      where: { brandId_slug: { brandId: to.id, slug: m.slug } },
      select: { id: true },
    });
    if (clash) {
      console.warn(`Not moving ${m.slug}: ${m.toBrand} already has it. Merge by hand.`);
      continue;
    }
    await prisma.fragrance.update({ where: { id: fragrance.id }, data: { brandId: to.id } });
    moved++;
  }
  return moved;
}

async function applyCsv(prisma: PrismaClient, desired: DesiredFragrance[]) {
  // Houses, notes, and accords the CSV mentions: create the missing ones.
  const houses = firstBySlug(desired.map((e) => e.house));
  const notes = firstBySlug(
    desired.flatMap((e) => [...e.notes.top, ...e.notes.heart, ...e.notes.base]),
  );
  const accords = firstBySlug(desired.flatMap((e) => e.accords.map((a) => a.name)));
  await prisma.brand.createMany({
    data: [...houses].map(([slug, name]) => ({ slug, name })),
    skipDuplicates: true,
  });
  await prisma.note.createMany({
    data: [...notes].map(([slug, name]) => ({ slug, name })),
    skipDuplicates: true,
  });
  await prisma.accord.createMany({
    data: [...accords].map(([slug, name]) => ({ slug, name })),
    skipDuplicates: true,
  });

  const brandId = new Map(
    (
      await prisma.brand.findMany({
        where: { slug: { in: [...houses.keys()] } },
        select: { id: true, slug: true },
      })
    ).map((b) => [b.slug, b.id]),
  );
  const noteId = new Map(
    (
      await prisma.note.findMany({
        where: { slug: { in: [...notes.keys()] } },
        select: { id: true, slug: true },
      })
    ).map((n) => [n.slug, n.id]),
  );
  const accordId = new Map(
    (
      await prisma.accord.findMany({
        where: { slug: { in: [...accords.keys()] } },
        select: { id: true, slug: true },
      })
    ).map((a) => [a.slug, a.id]),
  );
  missingOrThrow("houses", houses.keys(), brandId);
  missingOrThrow("notes", notes.keys(), noteId);
  missingOrThrow("accords", accords.keys(), accordId);

  // The current state of the rows the CSV lists, in one query.
  const houseOf = new Map([...brandId].map(([slug, id]) => [id, slug]));
  const rows = await prisma.fragrance.findMany({
    where: {
      brandId: { in: [...brandId.values()] },
      slug: { in: [...new Set(desired.map((e) => e.slug))] },
    },
    select: {
      id: true,
      slug: true,
      brandId: true,
      name: true,
      concentration: true,
      releaseYear: true,
      perfumer: true,
      gender: true,
      imagePath: true,
      status: true,
      notes: { select: { layer: true, note: { select: { slug: true } } } },
      accords: { select: { strength: true, accord: { select: { slug: true } } } },
    },
  });
  const existing = new Map<string, ExistingFragrance>(
    rows.map((r) => [
      catalogueKey(houseOf.get(r.brandId)!, r.slug),
      {
        id: r.id,
        name: r.name,
        concentration: r.concentration,
        releaseYear: r.releaseYear,
        perfumer: r.perfumer,
        gender: r.gender,
        imagePath: r.imagePath,
        status: r.status,
        notes: r.notes.map((n) => ({ slug: n.note.slug, layer: n.layer })),
        accords: r.accords.map((a) => ({ slug: a.accord.slug, strength: a.strength })),
      },
    ]),
  );

  const plan = planCatalogue(desired, existing);
  const links = (e: DesiredFragrance) => ({
    notes: noteLinks(e).map((n) => ({ noteId: noteId.get(n.slug)!, layer: n.layer })),
    accords: accordLinks(e).map((a) => ({ accordId: accordId.get(a.slug)!, strength: a.strength })),
  });

  for (const e of plan.create) {
    const l = links(e);
    await prisma.fragrance.create({
      data: {
        brandId: brandId.get(e.houseSlug)!,
        slug: e.slug,
        ...desiredFields(e),
        notes: { createMany: { data: l.notes } },
        accords: { createMany: { data: l.accords } },
      },
    });
  }
  for (const u of plan.update) {
    const l = links(u.entry);
    // One transaction per row: a row is never left with half its notes.
    await prisma.$transaction([
      prisma.fragrance.update({ where: { id: u.id }, data: u.fields }),
      ...(u.relink
        ? [
            prisma.fragranceNote.deleteMany({ where: { fragranceId: u.id } }),
            prisma.fragranceAccord.deleteMany({ where: { fragranceId: u.id } }),
            prisma.fragranceNote.createMany({
              data: l.notes.map((n) => ({ ...n, fragranceId: u.id })),
            }),
            prisma.fragranceAccord.createMany({
              data: l.accords.map((a) => ({ ...a, fragranceId: u.id })),
            }),
          ]
        : []),
    ]);
  }
  return { created: plan.create.length, updated: plan.update.length, unchanged: plan.unchanged };
}

/** Adds the Wikidata fragrances the catalogue doesn't have yet, in bulk. Create-only. */
async function applyWikidata(prisma: PrismaClient, path: string) {
  const snapshot = WikidataSnapshot.parse(JSON.parse(readFileSync(path, "utf8")));
  const items = snapshot.items
    .map((i) => ({ ...i, houseSlug: slugify(i.brand), slug: slugify(i.name) }))
    .filter((i) => i.houseSlug && i.slug);

  const houses = firstBySlug(items.map((i) => i.brand));
  await inChunks([...houses], (chunk) =>
    prisma.brand.createMany({
      data: chunk.map(([slug, name]) => ({ slug, name })),
      skipDuplicates: true,
    }),
  );
  const brandId = new Map<string, string>();
  await inChunks([...houses.keys()], async (chunk) => {
    for (const b of await prisma.brand.findMany({
      where: { slug: { in: chunk } },
      select: { id: true, slug: true },
    })) {
      brandId.set(b.slug, b.id);
    }
  });

  const have = new Set<string>();
  await inChunks([...brandId.values()], async (chunk) => {
    for (const f of await prisma.fragrance.findMany({
      where: { brandId: { in: chunk } },
      select: { brandId: true, slug: true },
    })) {
      have.add(`${f.brandId}/${f.slug}`);
    }
  });

  const toCreate = items.filter((i) => {
    const id = brandId.get(i.houseSlug);
    if (!id || have.has(`${id}/${i.slug}`)) return false;
    have.add(`${id}/${i.slug}`); // the snapshot is de-duplicated, but be sure
    return true;
  });
  await inChunks(toCreate, (chunk) =>
    prisma.fragrance.createMany({
      data: chunk.map((i) => ({
        brandId: brandId.get(i.houseSlug)!,
        slug: i.slug,
        name: i.name,
        releaseYear: i.releaseYear ?? null,
        concentration: "OTHER" as const,
      })),
      skipDuplicates: true,
    }),
  );
  return { created: toCreate.length, total: items.length };
}

export async function applyCatalogue(
  prisma: PrismaClient,
  opts: { csv?: string; wikidata?: string } = {},
): Promise<CatalogueSummary> {
  // Read and validate everything first: a bad file writes nothing.
  const desired = readCatalogue(opts.csv);
  const wikidataPath = opts.wikidata ?? WIKIDATA_SNAPSHOT;
  if (existsSync(wikidataPath)) {
    WikidataSnapshot.parse(JSON.parse(readFileSync(wikidataPath, "utf8")));
  }

  const moved = await applyMoves(prisma);
  const csv = await applyCsv(prisma, desired);
  const wikidata = existsSync(wikidataPath) ? await applyWikidata(prisma, wikidataPath) : null;
  return { rows: desired.length, ...csv, moved, wikidata };
}
