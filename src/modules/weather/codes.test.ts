import { describe, it, expect } from "vitest";
import { wmoCodeToCondition } from "./codes";

describe("wmoCodeToCondition", () => {
  it("maps clear sky", () => {
    expect(wmoCodeToCondition(0)).toBe("clear");
  });

  it("maps partly cloudy through overcast to clouds", () => {
    expect(wmoCodeToCondition(1)).toBe("clouds");
    expect(wmoCodeToCondition(2)).toBe("clouds");
    expect(wmoCodeToCondition(3)).toBe("clouds");
  });

  it("maps fog codes", () => {
    expect(wmoCodeToCondition(45)).toBe("fog");
    expect(wmoCodeToCondition(48)).toBe("fog");
  });

  it("maps drizzle, rain, and showers to rain", () => {
    for (const c of [51, 55, 61, 63, 65, 80, 82]) {
      expect(wmoCodeToCondition(c)).toBe("rain");
    }
  });

  it("maps snow codes", () => {
    for (const c of [71, 73, 75, 77, 85, 86]) {
      expect(wmoCodeToCondition(c)).toBe("snow");
    }
  });

  it("maps thunderstorm codes to storm", () => {
    for (const c of [95, 96, 99]) {
      expect(wmoCodeToCondition(c)).toBe("storm");
    }
  });

  it("returns null for unknown / non-finite inputs", () => {
    expect(wmoCodeToCondition(999)).toBeNull();
    expect(wmoCodeToCondition(NaN)).toBeNull();
  });
});
