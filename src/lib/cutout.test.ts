import { describe, it, expect } from "vitest";
import { removeLightBackground } from "./cutout";

/** Builds RGBA pixels from rows of single-character codes. */
const COLOURS: Record<string, [number, number, number]> = {
  W: [255, 255, 255], // background white
  w: [250, 250, 250], // near-white (still background-coloured)
  K: [20, 20, 60], // the product: dark blue glass
  C: [252, 248, 236], // a cream cap, inside the product
  g: [190, 190, 200], // anti-aliased edge: product blended into white
  h: [240, 240, 240], // neutral JPEG ringing near the edge
};
function image(rows: string[]) {
  const width = rows[0]!.length;
  const rgba = new Uint8Array(width * rows.length * 4);
  rows
    .join("")
    .split("")
    .forEach((ch, i) => {
      rgba.set([...COLOURS[ch]!, 255], i * 4);
    });
  return { rgba, width, height: rows.length };
}
const alphaAt = (img: ReturnType<typeof image>, x: number, y: number) =>
  img.rgba[(y * img.width + x) * 4 + 3];

describe("removeLightBackground", () => {
  it("clears white connected to the border and keeps the product", () => {
    const img = image(["WWWWW", "WKKKW", "WKKKw", "WWWWW"]);
    const { removed } = removeLightBackground(img.rgba, img.width, img.height);
    expect(removed).toBe(14);
    expect(alphaAt(img, 0, 0)).toBe(0);
    expect(alphaAt(img, 4, 2)).toBe(0); // near-white counts as background
    expect(alphaAt(img, 2, 1)).toBe(255);
  });

  it("keeps white inside the product (a cap enclosed by glass)", () => {
    const img = image(["WWWWW", "WKKKW", "WKCKW", "WKKKW", "WWWWW"]);
    removeLightBackground(img.rgba, img.width, img.height);
    expect(alphaAt(img, 2, 2)).toBe(255);
  });

  it("feathers a pale JPEG halo a few pixels deep, but not a tinted cap", () => {
    // The halo and the cap are both two pixels in from the background.
    const img = image(["WWWWWWW", "WKKKKKW", "WKhKCKW", "WKKKKKW", "WWWWWWW"]);
    removeLightBackground(img.rgba, img.width, img.height);
    expect(alphaAt(img, 2, 2)).toBeLessThan(40);
    expect(alphaAt(img, 4, 2)).toBe(255);
  });

  it("gives anti-aliased edge pixels partial alpha and unmixes the white", () => {
    const img = image(["WWWWW", "WgKgW", "WWWWW"]);
    removeLightBackground(img.rgba, img.width, img.height);
    const o = (1 * img.width + 1) * 4;
    const a = img.rgba[o + 3]!;
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
    // The pale blend gets darker once the white is taken out of it.
    expect(img.rgba[o]!).toBeLessThan(190);
  });

  it("leaves a photo with no light border untouched", () => {
    const img = image(["KKK", "KCK", "KKK"]);
    const before = img.rgba.slice();
    expect(removeLightBackground(img.rgba, img.width, img.height).removed).toBe(0);
    expect(img.rgba).toEqual(before);
  });
});
