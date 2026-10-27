import { describe, it, expect } from "vitest";
import { dominantColor, hexToRgb, hsla, paletteFor, rgbToHsl, type Rgb } from "./palette";

const pixels = (...colors: Array<[number, number, number, number]>) => colors.flat();

describe("rgbToHsl / hsla / hexToRgb", () => {
  it("converts the primaries and greys", () => {
    expect(rgbToHsl([255, 0, 0])).toEqual([0, 1, 0.5]);
    expect(rgbToHsl([0, 0, 255])[0]).toBe(240);
    expect(rgbToHsl([128, 128, 128])[1]).toBe(0);
  });

  it("formats canvas colours with the hue wrapped and values clamped", () => {
    expect(hsla(370, 1.2, 0.5, 0.4)).toBe("hsla(10, 100%, 50%, 0.4)");
  });

  it("reads #rrggbb and rejects anything else", () => {
    expect(hexToRgb("#e3a64a")).toEqual([227, 166, 74]);
    expect(hexToRgb(" 8c5c00 ")).toEqual([140, 92, 0]);
    expect(hexToRgb("rgb(1,2,3)")).toBeNull();
  });
});

describe("dominantColor", () => {
  it("is the bottle's colour, not its white cap or black shadow", () => {
    const blue: [number, number, number, number] = [40, 70, 200, 255];
    const color = dominantColor(
      pixels(blue, blue, [250, 250, 250, 255], [250, 250, 250, 255], [5, 5, 5, 255]),
    )!;
    const [h, s] = rgbToHsl(color);
    expect(h).toBeGreaterThan(200);
    expect(h).toBeLessThan(250);
    expect(s).toBeGreaterThan(0.4);
  });

  it("ignores transparent pixels, and is null when there are only those", () => {
    expect(dominantColor(pixels([255, 0, 0, 0], [255, 0, 0, 100]))).toBeNull();
    expect(dominantColor(pixels([255, 0, 0, 0], [0, 0, 255, 255]))).toEqual([0, 0, 255]);
  });
});

describe("paletteFor", () => {
  const accent: Rgb = [227, 166, 74];
  const blue: Rgb = [40, 70, 200];

  it("tints the Bottle background with the photo's hue, deep at the bottom", () => {
    const p = paletteFor("bottle", blue, accent);
    // (40, 70, 200) has a hue of 228.75°; saturation is capped at 70%.
    expect(p.top).toBe("hsla(228.8, 70%, 27%, 1)");
    expect(p.bottom).toMatch(/, 7%, 1\)$/);
    expect(p.auras).toHaveLength(2);
    expect(p.text).toBe("#ffffff");
  });

  it("falls back to the accent without a photo, and to charcoal for a grey bottle", () => {
    expect(paletteFor("bottle", null, accent)).toEqual(paletteFor("accent", null, accent));
    expect(paletteFor("bottle", [120, 120, 125], accent).top).toMatch(/, 0%, 24%, 1\)$/);
  });

  it("keeps Midnight dark and Paper light, with readable text on each", () => {
    expect(paletteFor("midnight", blue, accent).text).toBe("#f4f4f5");
    const paper = paletteFor("paper", blue, accent);
    expect(paper.top).toMatch(/, 95%, 1\)$/);
    expect(paper.text).toBe("#1a1714");
  });
});
