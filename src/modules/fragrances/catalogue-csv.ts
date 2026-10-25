// Relative, not "@/": the seed and catalogue scripts import this file through tsx.
import { slugify } from "../../lib/slug";
import { CONCENTRATIONS } from "./submit-schema";

/**
 * The curated catalogue as a spreadsheet: `prisma/data/catalogue.csv`, one row
 * per fragrance. Pure (no I/O): `prisma/catalogue.ts` reads the file and
 * applies it; this parses and validates it, so a bad row is reported with its
 * line number before anything is written.
 *
 * Columns, by header name (case and order don't matter; only house and
 * fragrance are required):
 *
 *   house, fragrance, concentration, year, gender, perfumer,
 *   top notes, heart notes, base notes, accords
 *
 * Notes are separated by ";" ("bergamot; lemon"). Accords are "name:strength"
 * with strength 1–5 ("woody:5; fresh:4"); a bare name means 3.
 */

export type Concentration = (typeof CONCENTRATIONS)[number];
export type Gender = "MASCULINE" | "FEMININE" | "UNISEX";

export type CatalogueEntry = {
  line: number;
  house: string;
  houseSlug: string;
  name: string;
  slug: string;
  concentration: Concentration;
  releaseYear: number | null;
  gender: Gender;
  perfumer: string | null;
  notes: { top: string[]; heart: string[]; base: string[] };
  accords: Array<{ name: string; strength: number }>;
};

export type CatalogueParseResult = { entries: CatalogueEntry[]; errors: string[] };

/** "brand-slug/fragrance-slug": the catalogue's identity for a fragrance. */
export function catalogueKey(houseSlug: string, slug: string): string {
  return `${houseSlug}/${slug}`;
}

// ------------------------------------------------------------------
// CSV
// ------------------------------------------------------------------

export type CsvRow = { line: number; cells: string[] };

/**
 * RFC 4180 CSV: comma-separated, fields optionally in double quotes (which may
 * contain commas and newlines), "" for a literal quote. Tolerates the UTF-8 BOM
 * and CRLF line ends that spreadsheet apps write. Each row keeps the line it
 * started on, for error messages.
 */
export function parseCsv(text: string): CsvRow[] {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let field = "";
  let quoted = false;
  let fieldStarted = false;
  let line = 1;
  let rowLine = 1;

  const endField = () => {
    cells.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRow = () => {
    endField();
    rows.push({ line: rowLine, cells });
    cells = [];
  };

  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        if (c === "\n") line++;
        field += c;
      }
      continue;
    }
    if (c === '"' && !fieldStarted) {
      quoted = true;
      fieldStarted = true;
    } else if (c === ",") {
      endField();
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      endRow();
      line++;
      rowLine = line;
    } else {
      field += c;
      fieldStarted = true;
    }
  }
  if (quoted) throw new Error(`Line ${rowLine}: a quoted field is never closed.`);
  if (fieldStarted || cells.length > 0) endRow();
  return rows;
}

/** One CSV line for `cells`, quoting only the fields that need it. */
export function toCsvRow(cells: string[]): string {
  return cells
    .map((c) => (/[",\r\n]/.test(c) || c !== c.trim() ? `"${c.replace(/"/g, '""')}"` : c))
    .join(",");
}

// ------------------------------------------------------------------
// Catalogue rows
// ------------------------------------------------------------------

export const CATALOGUE_COLUMNS = [
  "house",
  "fragrance",
  "concentration",
  "year",
  "gender",
  "perfumer",
  "top notes",
  "heart notes",
  "base notes",
  "accords",
] as const;
type Column = (typeof CATALOGUE_COLUMNS)[number];

const HEADER_ALIASES: Record<string, Column> = {
  house: "house",
  brand: "house",
  fragrance: "fragrance",
  name: "fragrance",
  concentration: "concentration",
  year: "year",
  "release year": "year",
  released: "year",
  gender: "gender",
  perfumer: "perfumer",
  nose: "perfumer",
  "top notes": "top notes",
  top: "top notes",
  "heart notes": "heart notes",
  heart: "heart notes",
  "middle notes": "heart notes",
  middle: "heart notes",
  "base notes": "base notes",
  base: "base notes",
  accords: "accords",
};

const CONCENTRATION_ALIASES: Record<string, Concentration> = {
  edp: "EDP",
  "eau de parfum": "EDP",
  edt: "EDT",
  "eau de toilette": "EDT",
  edc: "EDC",
  "eau de cologne": "EDC",
  parfum: "PARFUM",
  "pure parfum": "PARFUM",
  extrait: "EXTRAIT",
  "extrait de parfum": "EXTRAIT",
  cologne: "COLOGNE",
  other: "OTHER",
  "": "OTHER",
};

const GENDER_ALIASES: Record<string, Gender> = {
  masculine: "MASCULINE",
  men: "MASCULINE",
  male: "MASCULINE",
  m: "MASCULINE",
  feminine: "FEMININE",
  women: "FEMININE",
  female: "FEMININE",
  f: "FEMININE",
  unisex: "UNISEX",
  u: "UNISEX",
  "": "UNISEX",
};

const MAX = { house: 100, name: 200, perfumer: 200, note: 60, accord: 40 } as const;

/** Own keys only, so "constructor" in a cell is not an alias for something. */
function lookup<T>(map: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

const squash = (v: string) => v.trim().replace(/\s+/g, " ");

/** "a; b;  c" → ["a", "b", "c"], first spelling of each slug wins. */
function splitList(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(";")) {
    const item = squash(part);
    const slug = slugify(item);
    if (!item || !slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(item);
  }
  return out;
}

/** Parses and validates the whole file; never throws for bad content. */
export function parseCatalogue(text: string): CatalogueParseResult {
  let rows: CsvRow[];
  try {
    rows = parseCsv(text);
  } catch (err) {
    return { entries: [], errors: [(err as Error).message] };
  }
  const nonBlank = rows.filter((r) => r.cells.some((c) => c.trim() !== ""));
  const header = nonBlank[0];
  if (!header) return { entries: [], errors: ["The file is empty: add a header row."] };

  const errors: string[] = [];
  const index = new Map<Column, number>();
  header.cells.forEach((raw, i) => {
    const name = squash(raw).toLowerCase();
    if (!name) return; // spreadsheet apps leave unnamed trailing columns
    const column = lookup(HEADER_ALIASES, name);
    if (!column) {
      errors.push(
        `Line ${header.line}: unknown column "${squash(raw)}". Use: ${CATALOGUE_COLUMNS.join(", ")}.`,
      );
    } else if (index.has(column)) {
      errors.push(`Line ${header.line}: the "${column}" column appears twice.`);
    } else {
      index.set(column, i);
    }
  });
  for (const required of ["house", "fragrance"] as const) {
    if (!index.has(required)) errors.push(`Line ${header.line}: missing the "${required}" column.`);
  }
  if (errors.length > 0) return { entries: [], errors };

  const entries: CatalogueEntry[] = [];
  const firstLine = new Map<string, number>();

  for (const row of nonBlank.slice(1)) {
    const cell = (c: Column) => {
      const i = index.get(c);
      return i === undefined ? "" : squash(row.cells[i] ?? "");
    };
    const at = `Line ${row.line}`;
    const rowErrors: string[] = [];

    const house = cell("house");
    const name = cell("fragrance");
    const houseSlug = slugify(house);
    const slug = slugify(name);
    if (!houseSlug) rowErrors.push(`${at}: the house is missing.`);
    else if (house.length > MAX.house) rowErrors.push(`${at}: the house name is too long.`);
    if (!slug) rowErrors.push(`${at}: the fragrance name is missing.`);
    else if (name.length > MAX.name) rowErrors.push(`${at}: the fragrance name is too long.`);

    const concentrationRaw = cell("concentration");
    const concentration =
      lookup(CONCENTRATION_ALIASES, concentrationRaw.toLowerCase()) ??
      CONCENTRATIONS.find((c) => c === concentrationRaw.toUpperCase());
    if (!concentration) {
      rowErrors.push(
        `${at}: concentration "${concentrationRaw}" isn't one of EDP, EDT, EDC, Parfum, Extrait, Cologne, Other.`,
      );
    }

    const genderRaw = cell("gender");
    const gender = lookup(GENDER_ALIASES, genderRaw.toLowerCase());
    if (!gender) {
      rowErrors.push(`${at}: gender "${genderRaw}" isn't masculine, feminine, or unisex.`);
    }

    const yearRaw = cell("year");
    let releaseYear: number | null = null;
    if (yearRaw) {
      const year = Number(yearRaw);
      if (!/^\d{4}$/.test(yearRaw) || year < 1700 || year > 2100) {
        rowErrors.push(`${at}: year "${yearRaw}" isn't a year like 2015.`);
      } else {
        releaseYear = year;
      }
    }

    const perfumer = cell("perfumer") || null;
    if (perfumer && perfumer.length > MAX.perfumer)
      rowErrors.push(`${at}: the perfumer is too long.`);

    const notes = {
      top: splitList(cell("top notes")),
      heart: splitList(cell("heart notes")),
      base: splitList(cell("base notes")),
    };
    for (const note of [...notes.top, ...notes.heart, ...notes.base]) {
      if (note.length > MAX.note) rowErrors.push(`${at}: the note "${note}" is too long.`);
    }

    const accords: CatalogueEntry["accords"] = [];
    const accordSlugs = new Set<string>();
    for (const item of splitList(cell("accords"))) {
      const m = item.match(/^(.*?)\s*:\s*(\S+)$/);
      const accordName = squash(m ? m[1]! : item);
      const strength = m ? Number(m[2]) : 3;
      if (!slugify(accordName)) {
        rowErrors.push(`${at}: an accord has no name ("${item}").`);
      } else if (!Number.isInteger(strength) || strength < 1 || strength > 5) {
        rowErrors.push(`${at}: accord "${item}" needs a strength from 1 to 5, like "woody:4".`);
      } else if (accordName.length > MAX.accord) {
        rowErrors.push(`${at}: the accord "${accordName}" is too long.`);
      } else if (!accordSlugs.has(slugify(accordName))) {
        // First mention of an accord wins, as with notes.
        accordSlugs.add(slugify(accordName));
        accords.push({ name: accordName, strength });
      }
    }

    if (houseSlug && slug) {
      const key = catalogueKey(houseSlug, slug);
      const earlier = firstLine.get(key);
      if (earlier !== undefined) {
        rowErrors.push(`${at}: ${house} ${name} is already on line ${earlier}.`);
      } else {
        firstLine.set(key, row.line);
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }
    entries.push({
      line: row.line,
      house,
      houseSlug,
      name,
      slug,
      concentration: concentration!,
      releaseYear,
      gender: gender!,
      perfumer,
      notes,
      accords,
    });
  }

  return { entries, errors };
}

// ------------------------------------------------------------------
// Adding rows (used by `pnpm catalog:image`)
// ------------------------------------------------------------------

/** "Rasasi - Hawas Ice.jpg" → Rasasi / Hawas Ice. Null when the name has no " - ". */
export function nameFromPhotoFile(fileName: string): { house: string; fragrance: string } | null {
  const base = fileName.replace(/\.[^.]+$/, "");
  const m = base.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (!m) return null;
  const house = squash(m[1]!);
  const fragrance = squash(m[2]!);
  return slugify(house) && slugify(fragrance) ? { house, fragrance } : null;
}

/**
 * Appends a row (house and fragrance, everything else blank) for each of
 * `wanted` the file doesn't list yet, matching the file's own column order.
 * Existing rows are left byte-for-byte as they are.
 */
export function appendCatalogueRows(
  text: string,
  wanted: Array<{ house: string; fragrance: string }>,
): { text: string; added: Array<{ house: string; fragrance: string }> } {
  const rows = parseCsv(text).filter((r) => r.cells.some((c) => c.trim() !== ""));
  const header = rows[0];
  if (!header) throw new Error("The catalogue file has no header row.");
  const columnOf = (column: Column) =>
    header.cells.findIndex((raw) => lookup(HEADER_ALIASES, squash(raw).toLowerCase()) === column);
  const houseAt = columnOf("house");
  const nameAt = columnOf("fragrance");
  if (houseAt < 0 || nameAt < 0)
    throw new Error('The header needs "house" and "fragrance" columns.');

  const have = new Set(
    rows
      .slice(1)
      .map((r) => catalogueKey(slugify(r.cells[houseAt] ?? ""), slugify(r.cells[nameAt] ?? ""))),
  );
  const added: Array<{ house: string; fragrance: string }> = [];
  const lines: string[] = [];
  for (const w of wanted) {
    const key = catalogueKey(slugify(w.house), slugify(w.fragrance));
    if (have.has(key)) continue;
    have.add(key);
    const cells = header.cells.map(() => "");
    cells[houseAt] = w.house;
    cells[nameAt] = w.fragrance;
    lines.push(toCsvRow(cells));
    added.push(w);
  }
  if (lines.length === 0) return { text, added };
  const sep = text.length === 0 || text.endsWith("\n") ? "" : "\n";
  return { text: `${text}${sep}${lines.join("\n")}\n`, added };
}
