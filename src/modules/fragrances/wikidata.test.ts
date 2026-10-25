import { describe, it, expect } from "vitest";
import { WikidataSnapshot, parseCatalogue } from "./wikidata";

// Synthetic rows in the shape the SPARQL endpoint returns (not real items).
const uri = (id: string) => ({ type: "uri", value: `http://www.wikidata.org/entity/${id}` });
const lit = (value: string) => ({ type: "literal", value });
const row = (id: string, name: string, brand?: string, date?: string) => ({
  item: uri(id),
  itemLabel: lit(name),
  ...(brand ? { brandLabel: lit(brand) } : {}),
  ...(date ? { date: lit(date) } : {}),
});
const response = (...bindings: object[]) => ({ results: { bindings } });

describe("parseCatalogue", () => {
  it("maps id, house, name, and year", () => {
    expect(
      parseCatalogue(response(row("Q10", "Test Scent", "Test House", "1921-05-05T00:00:00Z"))),
    ).toEqual([{ qid: "Q10", brand: "Test House", name: "Test Scent", releaseYear: 1921 }]);
  });

  it("reads signed dates and leaves out years it cannot trust", () => {
    const rows = parseCatalogue(
      response(
        row("Q1", "Signed", "House", "+2001-01-01T00:00:00Z"),
        row("Q2", "Ancient", "House", "1200-01-01T00:00:00Z"),
        row("Q3", "Undated", "House"),
      ),
    );
    expect(rows.map((r) => [r.name, r.releaseYear])).toEqual([
      ["Ancient", undefined],
      ["Signed", 2001],
      ["Undated", undefined],
    ]);
  });

  it("drops rows without an English name or a house", () => {
    expect(
      parseCatalogue(
        response(row("Q1", "Q1", "House"), row("Q2", "No House"), row("Q3", "Fine", "Q99")),
      ),
    ).toEqual([]);
  });

  it("keeps one row per house and name slug, with the earliest year and lowest id", () => {
    const rows = parseCatalogue(
      response(
        row("Q30", "Test Scent", "Test House", "2005-01-01T00:00:00Z"),
        row("Q20", "TEST SCENT", "test house", "2003-01-01T00:00:00Z"),
        // The same item twice (it has both a brand and a manufacturer).
        row("Q30", "Test Scent", "Test House"),
      ),
    );
    expect(rows).toEqual([
      { qid: "Q20", brand: "Test House", name: "Test Scent", releaseYear: 2003 },
    ]);
  });

  it("sorts by house, then name", () => {
    const rows = parseCatalogue(
      response(row("Q1", "B", "Zed"), row("Q2", "Z", "Alpha"), row("Q3", "A", "Alpha")),
    );
    expect(rows.map((r) => `${r.brand} ${r.name}`)).toEqual(["Alpha A", "Alpha Z", "Zed B"]);
  });

  it("rejects a response that is not SPARQL JSON", () => {
    expect(() => parseCatalogue({ error: "timeout" })).toThrow();
  });
});

describe("WikidataSnapshot", () => {
  it("requires provenance alongside the rows", () => {
    const items = [{ qid: "Q1", brand: "House", name: "Scent" }];
    expect(
      WikidataSnapshot.safeParse({
        source: "Wikidata",
        license: "CC0-1.0",
        retrievedAt: "2026-10-25T00:00:00.000Z",
        query: "SELECT …",
        items,
      }).success,
    ).toBe(true);
    expect(WikidataSnapshot.safeParse({ source: "Wikidata", items }).success).toBe(false);
  });
});
