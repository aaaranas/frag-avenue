import { describe, expect, it } from "vitest";
import {
  WardrobeFilter,
  WardrobeItemFormInput,
  decimalStringToMinor,
  minorToDecimalString,
  toPersistenceInput,
} from "./schema";

const base = { fragranceId: "frag_1", kind: "BOTTLE", bottleSizeMl: "100" };
const issuesAt = (input: object, field: string) => {
  const r = WardrobeItemFormInput.safeParse(input);
  return r.success ? [] : r.error.issues.filter((i) => i.path[0] === field);
};

describe("WardrobeItemFormInput", () => {
  it("accepts each owned kind with a size", () => {
    for (const kind of ["BOTTLE", "DECANT", "SAMPLE"]) {
      expect(WardrobeItemFormInput.safeParse({ ...base, kind }).success).toBe(true);
    }
  });

  it("defaults the kind to BOTTLE", () => {
    const r = WardrobeItemFormInput.parse({ fragranceId: "frag_1", bottleSizeMl: "50" });
    expect(r.kind).toBe("BOTTLE");
  });

  it("requires a size for owned kinds but not for wishlist", () => {
    expect(issuesAt({ fragranceId: "f", kind: "SAMPLE" }, "bottleSizeMl")).toHaveLength(1);
    expect(WardrobeItemFormInput.safeParse({ fragranceId: "f", kind: "WISHLIST" }).success).toBe(
      true,
    );
  });

  it("rejects an unknown kind", () => {
    expect(issuesAt({ ...base, kind: "TESTER" }, "kind")).toHaveLength(1);
  });

  it("rejects remaining above the size", () => {
    expect(issuesAt({ ...base, remainingMl: "101" }, "remainingMl")).toHaveLength(1);
    expect(issuesAt({ ...base, remainingMl: "100" }, "remainingMl")).toHaveLength(0);
  });

  it("requires a currency with a price, and validates both", () => {
    expect(issuesAt({ ...base, priceDecimal: "3500" }, "currency")).toHaveLength(1);
    expect(
      issuesAt({ ...base, priceDecimal: "35.999", currency: "PHP" }, "priceDecimal"),
    ).toHaveLength(1);
    expect(issuesAt({ ...base, priceDecimal: "3500", currency: "pesos" }, "currency")).toHaveLength(
      1,
    );
    const ok = WardrobeItemFormInput.parse({ ...base, priceDecimal: "3500.5", currency: "php" });
    expect(ok.currency).toBe("PHP");
  });

  it("treats blank optional fields as absent", () => {
    const r = WardrobeItemFormInput.parse({
      ...base,
      remainingMl: "",
      priceDecimal: "",
      currency: "",
      purchaseDate: "",
      personalNotes: "",
    });
    expect(r.remainingMl).toBeUndefined();
    expect(r.priceDecimal).toBeUndefined();
    expect(r.purchaseDate).toBeUndefined();
  });
});

describe("toPersistenceInput", () => {
  it("stores the price in minor units with its currency", () => {
    const p = toPersistenceInput(
      WardrobeItemFormInput.parse({
        ...base,
        remainingMl: "60",
        priceDecimal: "3850",
        currency: "PHP",
      }),
    );
    expect(p).toMatchObject({
      kind: "BOTTLE",
      bottleSizeMl: 100,
      remainingMl: 60,
      purchasePriceMinor: 385_000,
      currency: "PHP",
    });
  });

  it("drops a currency that has no price", () => {
    const p = toPersistenceInput(WardrobeItemFormInput.parse({ ...base, currency: "PHP" }));
    expect(p.purchasePriceMinor).toBeNull();
    expect(p.currency).toBeNull();
  });

  it("clears fill level and purchase date for wishlist entries", () => {
    const p = toPersistenceInput(
      WardrobeItemFormInput.parse({
        fragranceId: "f",
        kind: "WISHLIST",
        bottleSizeMl: "150",
        remainingMl: "20",
        purchaseDate: "2026-01-01",
        priceDecimal: "11500",
        currency: "PHP",
      }),
    );
    expect(p).toMatchObject({
      kind: "WISHLIST",
      bottleSizeMl: 150,
      remainingMl: null,
      purchaseDate: null,
      purchasePriceMinor: 1_150_000,
    });
  });

  it("never includes legacy columns, so edits cannot clear them", () => {
    const p = toPersistenceInput(WardrobeItemFormInput.parse(base));
    for (const legacy of ["condition", "personalRating", "batchCode", "purchaseSource"]) {
      expect(p).not.toHaveProperty(legacy);
    }
  });
});

describe("WardrobeFilter", () => {
  it("maps ?type= to a kind and ignores anything else", () => {
    expect(WardrobeFilter.parse("decant")).toBe("DECANT");
    expect(WardrobeFilter.parse("wishlist")).toBe("WISHLIST");
    expect(WardrobeFilter.parse(undefined)).toBeUndefined();
    expect(WardrobeFilter.parse("everything")).toBeUndefined();
    expect(WardrobeFilter.parse(["bottle", "sample"])).toBeUndefined();
  });
});

describe("money strings", () => {
  it("round-trips decimal strings and minor units", () => {
    expect(decimalStringToMinor("3850")).toBe(385_000);
    expect(decimalStringToMinor("12.5")).toBe(1250);
    expect(decimalStringToMinor("0.07")).toBe(7);
    expect(minorToDecimalString(385_000)).toBe("3850.00");
    expect(minorToDecimalString(7)).toBe("0.07");
  });
});
