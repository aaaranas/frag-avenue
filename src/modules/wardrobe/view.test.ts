import { describe, expect, it } from "vitest";
import { fillLabel, fillRatio, itemCostPerWearMinor, itemLabel, wearCountLabel } from "./view";

describe("itemCostPerWearMinor", () => {
  it("is price divided by wears, rounded to a minor unit", () => {
    expect(itemCostPerWearMinor("BOTTLE", 385_000, 1)).toBe(385_000);
    expect(itemCostPerWearMinor("BOTTLE", 385_000, 3)).toBe(128_333);
    expect(itemCostPerWearMinor("DECANT", 120_000, 4)).toBe(30_000);
  });

  it("is null for never-worn items, items without a price, and wishlist entries", () => {
    expect(itemCostPerWearMinor("BOTTLE", 385_000, 0)).toBeNull();
    expect(itemCostPerWearMinor("SAMPLE", null, 5)).toBeNull();
    expect(itemCostPerWearMinor("WISHLIST", 1_150_000, 2)).toBeNull();
  });
});

describe("fillRatio / fillLabel", () => {
  it("computes the remaining share, clamped to 0..1", () => {
    expect(fillRatio(100, 62)).toBeCloseTo(0.62);
    expect(fillRatio(100, 150)).toBe(1);
    expect(fillRatio(100, 0)).toBe(0);
  });

  it("is unknown without both numbers", () => {
    expect(fillRatio(null, 10)).toBeNull();
    expect(fillRatio(100, null)).toBeNull();
    expect(fillLabel(null)).toBeNull();
  });

  it("labels without claiming empty or full when it is not", () => {
    expect(fillLabel(0)).toBe("Empty");
    expect(fillLabel(1)).toBe("Full");
    expect(fillLabel(0.62)).toBe("62% full");
    expect(fillLabel(0.002)).toBe("1% full");
    expect(fillLabel(0.998)).toBe("99% full");
  });
});

describe("wearCountLabel", () => {
  it("pluralises", () => {
    expect(wearCountLabel(0)).toBe("0 wears");
    expect(wearCountLabel(1)).toBe("1 wear");
    expect(wearCountLabel(12)).toBe("12 wears");
  });
});

describe("itemLabel", () => {
  it("puts the size before an owned item's kind", () => {
    expect(itemLabel("BOTTLE", "100 ml")).toBe("100 ml bottle");
    expect(itemLabel("DECANT", "3.4 fl oz")).toBe("3.4 fl oz decant");
  });

  it("is just the kind when the size is unknown", () => {
    expect(itemLabel("SAMPLE", null)).toBe("Sample");
  });

  it("names a wishlist entry first", () => {
    expect(itemLabel("WISHLIST", "50 ml")).toBe("Wishlist, 50 ml");
    expect(itemLabel("WISHLIST", null)).toBe("Wishlist");
  });
});
