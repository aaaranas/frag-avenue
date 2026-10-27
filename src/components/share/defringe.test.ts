import { describe, it, expect } from "vitest";
import { erodeAlpha } from "./defringe";

/** A w×h image: opaque grey where `opaque(x, y)`, transparent elsewhere. */
function image(w: number, h: number, opaque: (x: number, y: number) => boolean) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      rgba.set([200, 210, 220, opaque(x, y) ? 255 : 0], (y * w + x) * 4);
    }
  }
  return rgba;
}
const alphaAt = (rgba: Uint8ClampedArray, w: number, x: number, y: number) =>
  rgba[(y * w + x) * 4 + 3];

describe("erodeAlpha", () => {
  it("drops the outermost ring of a shape and keeps its inside", () => {
    // A 3×3 square in a 5×5 image: only its centre survives.
    const out = erodeAlpha(
      image(5, 5, (x, y) => x >= 1 && x <= 3 && y >= 1 && y <= 3),
      5,
      5,
    );
    expect(alphaAt(out, 5, 2, 2)).toBe(255);
    expect(alphaAt(out, 5, 1, 1)).toBe(0);
    expect(alphaAt(out, 5, 3, 2)).toBe(0);
  });

  it("removes a one-pixel speck on the edge, and leaves colour alone", () => {
    const rgba = image(3, 3, (x, y) => x === 1 && y === 1);
    const out = erodeAlpha(rgba, 3, 3);
    expect(alphaAt(out, 3, 1, 1)).toBe(0);
    expect(Array.from(out.slice(16, 19))).toEqual([200, 210, 220]);
    // The input is not modified.
    expect(alphaAt(rgba, 3, 1, 1)).toBe(255);
  });

  it("does not eat a shape where it meets the image's border", () => {
    const out = erodeAlpha(
      image(4, 4, () => true),
      4,
      4,
    );
    expect(alphaAt(out, 4, 0, 0)).toBe(255);
    expect(alphaAt(out, 4, 3, 3)).toBe(255);
  });
});
