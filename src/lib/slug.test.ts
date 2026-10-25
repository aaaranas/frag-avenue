import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("matches the slugs already in the seeded catalogue", () => {
    expect(slugify("Maison Francis Kurkdjian")).toBe("maison-francis-kurkdjian");
    expect(slugify("Baccarat Rouge 540")).toBe("baccarat-rouge-540");
    expect(slugify("Hawas Ice")).toBe("hawas-ice");
  });

  it("folds accents and punctuation so near-duplicates collide", () => {
    expect(slugify("Hermès")).toBe("hermes");
    expect(slugify("  Terre d'Hermès  ")).toBe("terre-d-hermes");
    expect(slugify("L'Homme — Intense!")).toBe("l-homme-intense");
  });
});
