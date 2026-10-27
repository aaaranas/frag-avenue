import { describe, it, expect } from "vitest";
import { fitText, wrap, type Measure } from "./text-fit";

// Every character is half the font size wide.
const measure: Measure = (text, size) => text.length * size * 0.5;

describe("wrap", () => {
  it("breaks between words to stay inside the width", () => {
    expect(wrap(measure, "Baccarat Rouge 540", 10, 50)).toEqual(["Baccarat", "Rouge 540"]);
  });

  it("gives an over-long word its own line rather than dropping it", () => {
    expect(wrap(measure, "a Supercalifragilistic b", 10, 40)).toEqual([
      "a",
      "Supercalifragilistic",
      "b",
    ]);
  });
});

describe("fitText", () => {
  it("uses the largest size that fits on one line", () => {
    // 7 characters × 114 × 0.5 = 399, the last size within 400.
    expect(
      fitText(measure, "Aventus", { maxWidth: 400, maxSize: 120, minSize: 60, maxLines: 2 }),
    ).toEqual({ size: 114, lines: ["Aventus"] });
  });

  it("wraps onto two lines before shrinking below what one line would need", () => {
    const fit = fitText(measure, "Maison Francis Kurkdjian Baccarat", {
      maxWidth: 600,
      maxSize: 80,
      minSize: 40,
      maxLines: 2,
    });
    expect(fit.lines).toHaveLength(2);
    expect(fit.lines.every((l) => measure(l, fit.size) <= 600)).toBe(true);
  });

  it("cuts the last line with an ellipsis when even the smallest size needs more lines", () => {
    const fit = fitText(measure, "one two three four five six seven eight", {
      maxWidth: 60,
      maxSize: 20,
      minSize: 10,
      maxLines: 2,
    });
    expect(fit.size).toBe(10);
    expect(fit.lines).toHaveLength(2);
    expect(fit.lines[1]!.endsWith("…")).toBe(true);
    expect(measure(fit.lines[1]!, 10)).toBeLessThanOrEqual(60);
  });
});
