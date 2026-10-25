/**
 * Refreshes the Wikidata catalogue snapshot (`prisma/data/wikidata-catalogue.json`).
 *
 *   pnpm db:catalogue:fetch
 *
 * Wikidata is CC0, and the query service is meant for this: one query, with a
 * descriptive User-Agent (https://meta.wikimedia.org/wiki/User-Agent_policy).
 * Review the diff before committing; `pnpm db:seed` then imports it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  CATALOGUE_QUERY,
  WikidataSnapshot,
  parseCatalogue,
} from "../src/modules/fragrances/wikidata";

const ENDPOINT = "https://query.wikidata.org/sparql";
const OUT = "prisma/data/wikidata-catalogue.json";
const USER_AGENT = "FragAvenueCatalogue/0.1 (https://github.com/aaaranas/frag-avenue)";

async function main() {
  const url = `${ENDPOINT}?${new URLSearchParams({ query: CATALOGUE_QUERY, format: "json" })}`;
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Wikidata query failed: ${res.status} ${res.statusText}`);

  const items = parseCatalogue(await res.json());
  // An empty result means the query broke, not that perfume stopped existing.
  if (items.length === 0) throw new Error("Wikidata returned no fragrances; snapshot not written.");

  const snapshot = WikidataSnapshot.parse({
    source: "Wikidata",
    license: "CC0-1.0",
    retrievedAt: new Date().toISOString(),
    query: CATALOGUE_QUERY,
    items,
  });
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  const houses = new Set(items.map((i) => i.brand)).size;
  console.log(`Wrote ${items.length} fragrances from ${houses} houses to ${OUT}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
