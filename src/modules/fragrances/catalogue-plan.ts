// Relative, not "@/": the seed and catalogue scripts import this file through tsx.
import { slugify } from "../../lib/slug";
import { catalogueKey, type CatalogueEntry } from "./catalogue-csv";

/**
 * Decides what applying the catalogue changes: which rows to create, which to
 * update (and how), and which already match. Pure, so the rules are tested
 * without a database; `prisma/catalogue.ts` loads the current state and
 * carries the plan out.
 *
 * The CSV is the truth for the rows it lists (fields, notes, accords, and
 * APPROVED status). Rows it doesn't list are never touched, and nothing is
 * ever deleted: wardrobe items and wears point at catalogue rows.
 */

export type NoteLayer = "TOP" | "MIDDLE" | "BASE";

/** A CSV entry plus its photo, resolved by the caller (null when there is none). */
export type DesiredFragrance = CatalogueEntry & { imagePath: string | null };

export type ExistingFragrance = {
  id: string;
  name: string;
  concentration: string;
  releaseYear: number | null;
  perfumer: string | null;
  gender: string;
  imagePath: string | null;
  status: string;
  notes: Array<{ slug: string; layer: NoteLayer }>;
  accords: Array<{ slug: string; strength: number }>;
};

export type FragranceFields = {
  name: string;
  concentration: DesiredFragrance["concentration"];
  releaseYear: number | null;
  perfumer: string | null;
  gender: DesiredFragrance["gender"];
  imagePath: string | null;
  status: "APPROVED";
};

export type CataloguePlan = {
  create: DesiredFragrance[];
  update: Array<{
    id: string;
    entry: DesiredFragrance;
    /** Only the fields that differ. */
    fields: Partial<FragranceFields>;
    /** Notes or accords differ: replace them with the CSV's. */
    relink: boolean;
  }>;
  unchanged: number;
};

/** The note links an entry should have, as layer + slug. */
export function noteLinks(entry: CatalogueEntry): Array<{ slug: string; layer: NoteLayer }> {
  return [
    ...entry.notes.top.map((n) => ({ slug: slugify(n), layer: "TOP" as const })),
    ...entry.notes.heart.map((n) => ({ slug: slugify(n), layer: "MIDDLE" as const })),
    ...entry.notes.base.map((n) => ({ slug: slugify(n), layer: "BASE" as const })),
  ];
}

export function accordLinks(entry: CatalogueEntry): Array<{ slug: string; strength: number }> {
  return entry.accords.map((a) => ({ slug: slugify(a.name), strength: a.strength }));
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("\n") === [...b].sort().join("\n");

export function desiredFields(entry: DesiredFragrance): FragranceFields {
  return {
    name: entry.name,
    concentration: entry.concentration,
    releaseYear: entry.releaseYear,
    perfumer: entry.perfumer,
    gender: entry.gender,
    imagePath: entry.imagePath,
    status: "APPROVED",
  };
}

export function planCatalogue(
  desired: DesiredFragrance[],
  existing: ReadonlyMap<string, ExistingFragrance>,
): CataloguePlan {
  const plan: CataloguePlan = { create: [], update: [], unchanged: 0 };
  for (const entry of desired) {
    const current = existing.get(catalogueKey(entry.houseSlug, entry.slug));
    if (!current) {
      plan.create.push(entry);
      continue;
    }

    const want = desiredFields(entry);
    const fields: Partial<FragranceFields> = {};
    for (const key of Object.keys(want) as Array<keyof FragranceFields>) {
      if (want[key] !== current[key]) Object.assign(fields, { [key]: want[key] });
    }

    const relink =
      !sameSet(
        noteLinks(entry).map((n) => `${n.layer}:${n.slug}`),
        current.notes.map((n) => `${n.layer}:${n.slug}`),
      ) ||
      !sameSet(
        accordLinks(entry).map((a) => `${a.slug}:${a.strength}`),
        current.accords.map((a) => `${a.slug}:${a.strength}`),
      );

    if (Object.keys(fields).length === 0 && !relink) {
      plan.unchanged++;
    } else {
      plan.update.push({ id: current.id, entry, fields, relink });
    }
  }
  return plan;
}
