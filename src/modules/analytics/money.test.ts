import { describe, it, expect } from "vitest";
import { costPerWearMinor, formatMoney } from "./money";

describe("money", () => {
  it("formats minor units as a currency string", () => {
    expect(formatMoney({ amountMinor: 12345, currency: "USD" })).toBe("$123.45");
  });

  it("costPerWearMinor divides and rounds", () => {
    expect(costPerWearMinor(30000, 3)).toBe(10000);
    expect(costPerWearMinor(10000, 3)).toBe(3333);
  });

  it("costPerWearMinor returns null for zero wears (no fake infinity)", () => {
    expect(costPerWearMinor(30000, 0)).toBeNull();
  });

  it("costPerWearMinor returns null for a missing/zero price", () => {
    expect(costPerWearMinor(0, 5)).toBeNull();
  });
});
