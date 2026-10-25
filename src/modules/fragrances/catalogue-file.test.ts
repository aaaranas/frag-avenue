import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { parseCatalogue } from "./catalogue-csv";

// The real file, checked in CI so a bad edit fails here rather than in the
// Vercel build (where `pnpm catalog:apply` would stop the deploy).
const text = readFileSync("prisma/data/catalogue.csv", "utf8");

describe("prisma/data/catalogue.csv", () => {
  it("is valid", () => {
    const { entries, errors } = parseCatalogue(text);
    expect(errors).toEqual([]);
    expect(entries.length).toBeGreaterThan(0);
  });

  it("has a row for every photo in public/catalog", () => {
    const keys = new Set(parseCatalogue(text).entries.map((e) => `${e.houseSlug}-${e.slug}`));
    const orphans = readdirSync("public/catalog")
      .filter((f) => f.endsWith(".webp"))
      .map((f) => f.replace(/\.webp$/, ""))
      .filter((name) => !keys.has(name));
    expect(orphans).toEqual([]);
  });
});
