/**
 * A photo's alpha shrunk by one pixel: each pixel takes the lowest alpha
 * around it. A cutout keeps a ring of its old background on the edge — a pale
 * rim that shows on a dark card, more so once the photo is scaled up — and this
 * drops it. Colour is untouched. Pure.
 */
export function erodeAlpha(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let min = 255;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++) {
          min = Math.min(min, rgba[(yy * width + xx) * 4 + 3]!);
        }
      }
      out[(y * width + x) * 4 + 3] = min;
    }
  }
  return out;
}
