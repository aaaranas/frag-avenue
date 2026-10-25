import { describe, it, expect } from "vitest";
import { celsiusToFahrenheit, formatTemperature, formatVolume, mlToFlOz } from "./units";

describe("units", () => {
  it("converts temperature", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });

  it("converts volume", () => {
    expect(mlToFlOz(29.5735295625)).toBeCloseTo(1, 10);
    expect(mlToFlOz(100)).toBeCloseTo(3.381, 3);
  });

  it("formats in the requested system, rounding only for display", () => {
    expect(formatTemperature(21.4, "METRIC")).toBe("21°C");
    expect(formatTemperature(21.4, "IMPERIAL")).toBe("71°F");
    expect(formatTemperature(-0.4, "METRIC")).toBe("0°C"); // never "-0°C"
    expect(formatVolume(100, "METRIC")).toBe("100 ml");
    expect(formatVolume(100, "IMPERIAL")).toBe("3.4 fl oz");
    expect(formatVolume(30, "IMPERIAL")).toBe("1.0 fl oz");
  });
});
