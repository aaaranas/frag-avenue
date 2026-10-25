import { z } from "zod";
// Relative, not "@/": the seed and fetch script import this file through tsx.
import { slugify } from "../../lib/slug";

/**
 * Catalogue import from Wikidata (CC0). Pure: the fetch lives in
 * `prisma/fetch-wikidata-catalogue.ts`, which writes a committed snapshot that
 * `prisma/catalogue.ts` applies (seed and every deploy), so that never needs the network.
 *
 * Wikidata gives house, name, and year only. Notes and accords stay
 * first-party curated; concentration is unknown, so imports are `OTHER`.
 */

/**
 * Items that are an instance of "perfume" (or of a subclass of it), with their
 * brand (P1716, else manufacturer P176) and earliest date (inception P571, else
 * publication date P577). The class is matched by its English label so the
 * query does not depend on a hard-coded id.
 */
export const CATALOGUE_QUERY = `
SELECT ?item ?itemLabel ?brandLabel ?date WHERE {
  ?class rdfs:label "perfume"@en .
  ?item wdt:P31/wdt:P279* ?class .
  { ?item wdt:P1716 ?brand } UNION { ?item wdt:P176 ?brand }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P577 ?published }
  BIND(COALESCE(?inception, ?published) AS ?date)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`.trim();

const Binding = z.object({ type: z.string(), value: z.string() });

export const SparqlResponse = z.object({
  results: z.object({
    bindings: z.array(
      z.object({
        item: Binding,
        itemLabel: Binding.optional(),
        brandLabel: Binding.optional(),
        date: Binding.optional(),
      }),
    ),
  }),
});

export const WikidataFragrance = z.object({
  qid: z.string().regex(/^Q\d+$/),
  brand: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  releaseYear: z.number().int().min(1700).max(2100).optional(),
});
export type WikidataFragrance = z.infer<typeof WikidataFragrance>;

/** The committed file: provenance plus the parsed rows. */
export const WikidataSnapshot = z.object({
  source: z.literal("Wikidata"),
  license: z.literal("CC0-1.0"),
  retrievedAt: z.string().datetime(),
  query: z.string(),
  items: z.array(WikidataFragrance),
});
export type WikidataSnapshot = z.infer<typeof WikidataSnapshot>;

const QID = /\/entity\/(Q\d+)$/;
// The label service falls back to the bare id when there is no English label.
const UNLABELLED = /^Q\d+$/;

function year(value: string | undefined): number | undefined {
  // xsd:dateTime, possibly with a leading sign: "+1921-01-01T00:00:00Z".
  const m = value?.match(/^[+]?(\d{4})-/);
  if (!m) return undefined;
  const y = Number(m[1]);
  return y >= 1700 && y <= 2100 ? y : undefined;
}

/**
 * Turns SPARQL JSON into catalogue rows: one per (house, name) slug pair —
 * the same key the seed and user submissions dedupe on — keeping the earliest
 * year. Rows without an English name or house are dropped. Sorted for stable
 * snapshots.
 */
export function parseCatalogue(json: unknown): WikidataFragrance[] {
  const { bindings } = SparqlResponse.parse(json).results;
  const byKey = new Map<string, WikidataFragrance>();

  for (const b of bindings) {
    const qid = b.item.value.match(QID)?.[1];
    const name = b.itemLabel?.value.trim();
    const brand = b.brandLabel?.value.trim();
    if (!qid || !name || !brand || UNLABELLED.test(name) || UNLABELLED.test(brand)) continue;

    const row = WikidataFragrance.safeParse({ qid, brand, name, releaseYear: year(b.date?.value) });
    if (!row.success) continue;

    const key = `${slugify(brand)}/${slugify(name)}`;
    const seen = byKey.get(key);
    if (!seen) {
      byKey.set(key, row.data);
      continue;
    }
    const years = [seen.releaseYear, row.data.releaseYear].filter((y) => y !== undefined);
    byKey.set(key, {
      ...seen,
      // The lower id is the older, usually canonical, item.
      qid: Number(row.data.qid.slice(1)) < Number(seen.qid.slice(1)) ? row.data.qid : seen.qid,
      releaseYear: years.length ? Math.min(...years) : undefined,
    });
  }

  return [...byKey.values()].sort(
    (a, b) => a.brand.localeCompare(b.brand, "en") || a.name.localeCompare(b.name, "en"),
  );
}
