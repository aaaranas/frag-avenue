import { describe, it, expect } from "vitest";
import {
  CollectionItemFormInput,
  decimalStringToMinor,
  minorToDecimalString,
  toPersistenceInput,
} from "./schema";

const base = { fragranceId: "clx0000abc", bottleSizeMl: "100", condition: "NEW" };

describe("CollectionItemFormInput", () => {
  it("accepts the minimum required input", () => {
    const r = CollectionItemFormInput.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("requires currency when a price is set", () => {
    const r = CollectionItemFormInput.safeParse({ ...base, priceDecimal: "150.00" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "currency")).toBe(true);
    }
  });

  it("rejects remainingMl greater than bottleSizeMl", () => {
    const r = CollectionItemFormInput.safeParse({ ...base, remainingMl: "150" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "remainingMl")).toBe(true);
    }
  });

  it("uppercases and validates currency codes", () => {
    const r = CollectionItemFormInput.safeParse({
      ...base,
      priceDecimal: "10",
      currency: "usd",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.currency).toBe("USD");
  });

  it("rejects malformed currency codes", () => {
    const r = CollectionItemFormInput.safeParse({
      ...base,
      priceDecimal: "10",
      currency: "US",
    });
    expect(r.success).toBe(false);
  });

  it("rejects malformed price strings", () => {
    const r = CollectionItemFormInput.safeParse({ ...base, priceDecimal: "1,50", currency: "USD" });
    expect(r.success).toBe(false);
  });
});

describe("money conversion", () => {
  it("decimal string → integer minor units", () => {
    expect(decimalStringToMinor("150.00")).toBe(15000);
    expect(decimalStringToMinor("150")).toBe(15000);
    expect(decimalStringToMinor("150.5")).toBe(15050);
    expect(decimalStringToMinor("0.99")).toBe(99);
    expect(decimalStringToMinor("0")).toBe(0);
  });

  it("integer minor units → decimal string, two-decimal-padded", () => {
    expect(minorToDecimalString(15000)).toBe("150.00");
    expect(minorToDecimalString(15050)).toBe("150.50");
    expect(minorToDecimalString(99)).toBe("0.99");
    expect(minorToDecimalString(0)).toBe("0.00");
  });

  it("round-trips", () => {
    for (const v of [0, 1, 99, 15000, 999999]) {
      expect(decimalStringToMinor(minorToDecimalString(v))).toBe(v);
    }
  });
});

describe("toPersistenceInput", () => {
  it("nulls-out currency when no price is set", () => {
    const parsed = CollectionItemFormInput.parse({ ...base, currency: "USD" });
    const p = toPersistenceInput(parsed);
    expect(p.purchasePriceMinor).toBeNull();
    expect(p.currency).toBeNull(); // no price → currency is not persisted
  });

  it("persists price + currency together", () => {
    const parsed = CollectionItemFormInput.parse({
      ...base,
      priceDecimal: "200.00",
      currency: "eur",
    });
    const p = toPersistenceInput(parsed);
    expect(p.purchasePriceMinor).toBe(20000);
    expect(p.currency).toBe("EUR");
  });

  it("collapses empty optional strings to null", () => {
    const parsed = CollectionItemFormInput.parse({
      ...base,
      purchaseSource: "",
      batchCode: "",
      personalNotes: "",
    });
    const p = toPersistenceInput(parsed);
    expect(p.purchaseSource).toBeNull();
    expect(p.batchCode).toBeNull();
    expect(p.personalNotes).toBeNull();
  });
});
