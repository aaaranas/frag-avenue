import { describe, it, expect } from "vitest";
import { backTo, fragranceHref, type BackTarget } from "./back-to";

const catalogue: BackTarget = { href: "/fragrances", label: "Catalogue" };

describe("backTo", () => {
  it("goes back to the screen that linked here", () => {
    expect(backTo("/feed", catalogue)).toEqual({ href: "/feed", label: "Feed" });
    expect(backTo("/wardrobe", catalogue)).toEqual({ href: "/wardrobe", label: "Wardrobe" });
    expect(backTo("/stats", catalogue)).toEqual({ href: "/stats", label: "Stats" });
    expect(backTo("/wears/cmvqz4bo4002g", catalogue)).toEqual({
      href: "/wears/cmvqz4bo4002g",
      label: "Wear",
    });
    expect(backTo("/u/mika", catalogue)).toEqual({ href: "/u/mika", label: "@mika" });
  });

  it("falls back for anything else, so the link can't point off-site", () => {
    for (const from of [
      undefined,
      ["/feed"],
      "",
      "https://evil.example",
      "//evil.example",
      "/feed/../../x",
      "/profile",
      "/u/Not-A-Handle",
      "/wears/a/b",
    ]) {
      expect(backTo(from, catalogue)).toBe(catalogue);
    }
  });
});

describe("fragranceHref", () => {
  it("carries the linking screen as ?from=", () => {
    expect(fragranceHref("abc", "/u/mika")).toBe("/fragrances/abc?from=%2Fu%2Fmika");
  });
});
