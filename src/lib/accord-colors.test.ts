import { describe, it, expect } from "vitest";
import { accordColor, primaryAccordColor } from "./accord-colors";

describe("accordColor", () => {
  it("returns a color for a known accord", () => {
    expect(accordColor("aquatic")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(accordColor("amber")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(accordColor("Amber")).toBe(accordColor("amber"));
    expect(accordColor("  aquatic ")).toBe(accordColor("aquatic"));
  });

  it("returns the default color for an unknown accord", () => {
    expect(accordColor("does-not-exist")).toBe(accordColor("default"));
  });
});

describe("primaryAccordColor", () => {
  it("picks the strongest accord", () => {
    const c = primaryAccordColor([
      { name: "aquatic", strength: 5 },
      { name: "citrus", strength: 3 },
    ]);
    expect(c).toBe(accordColor("aquatic"));
  });

  it("tie-breaks alphabetically", () => {
    const c = primaryAccordColor([
      { name: "woody", strength: 5 },
      { name: "amber", strength: 5 },
    ]);
    expect(c).toBe(accordColor("amber"));
  });

  it("falls back to default for an empty accord list", () => {
    expect(primaryAccordColor([])).toBe(accordColor("default"));
  });
});
