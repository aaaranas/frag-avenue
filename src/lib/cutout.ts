/**
 * Removes a plain light background from a product photo, in place, on raw RGBA
 * pixels. Pure (no I/O), so `prisma/catalog-image.ts` and tests share it.
 *
 * Background = near-white, near-grey pixels CONNECTED TO THE BORDER (flood
 * fill), so white parts of the product itself — a white cap, a label — stay
 * opaque unless they touch the background through near-white pixels.
 *
 * The product's outline is anti-aliased into the white, and a JPEG adds a
 * pale ringing halo a few pixels wide. So pixels within `edgeWidth` of the
 * background get partial alpha from how white they are, and the white is
 * "unmixed" out of their colour; otherwise the photo keeps a pale fringe on
 * the dark theme. Dark pixels stay opaque. Beyond the first ring only neutral
 * pixels (as untinted as the background) are feathered: the halo is neutral,
 * while a cream cap or label touching the background is not, so it keeps its
 * edge.
 */
export type CutoutOptions = {
  /** A pixel is background-coloured if its darkest channel is at least this. */
  minLightness?: number;
  /** …and its channels differ by at most this. Kept tight: a cream cap or label
   *  differs from the white background mostly by its slight tint. */
  maxSpread?: number;
  /** How many pixels in from the background to feather (the halo's width). */
  edgeWidth?: number;
};

export function removeLightBackground(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  { minLightness = 248, maxSpread = 12, edgeWidth = 3 }: CutoutOptions = {},
): { removed: number } {
  const n = width * height;
  const isLight = (i: number) => {
    const r = rgba[i * 4]!;
    const g = rgba[i * 4 + 1]!;
    const b = rgba[i * 4 + 2]!;
    return Math.min(r, g, b) >= minLightness && Math.max(r, g, b) - Math.min(r, g, b) <= maxSpread;
  };

  // Flood fill from every light border pixel (4-connected).
  const bg = new Uint8Array(n);
  const stack: number[] = [];
  const seed = (i: number) => {
    if (!bg[i] && isLight(i)) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    if (x > 0) seed(i - 1);
    if (x < width - 1) seed(i + 1);
    if (i >= width) seed(i - width);
    if (i < n - width) seed(i + width);
  }

  let removed = 0;
  for (let i = 0; i < n; i++) {
    if (bg[i]) {
      rgba[i * 4 + 3] = 0;
      removed++;
    }
  }

  // Feather the edge band: distance (8-connected rings) from the background,
  // up to edgeWidth.
  const ring = new Uint8Array(n); // 0 = background or beyond the band
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) if (bg[i]) frontier.push(i);
  for (let d = 1; d <= edgeWidth && frontier.length; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % width;
      const y = (i - x) / width;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const j = ny * width + nx;
          if (bg[j] || ring[j]) continue;
          ring[j] = d;
          next.push(j);
        }
      }
    }
    frontier = next;
  }

  for (let i = 0; i < n; i++) {
    const d = ring[i]!;
    if (!d) continue;
    const o = i * 4;
    const light = Math.min(rgba[o]!, rgba[o + 1]!, rgba[o + 2]!);
    const spread = Math.max(rgba[o]!, rgba[o + 1]!, rgba[o + 2]!) - light;
    if (d > 1 && spread > maxSpread) continue;
    // How far from white this pixel is, as coverage: white → 0, a pixel 128 or
    // more below white → fully opaque.
    const a = Math.min(1, (255 - light) / 128);
    if (a <= 0) {
      rgba[o + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c++) {
      // Unmix: observed = a·colour + (1 − a)·white.
      const unmixed = (rgba[o + c]! - (1 - a) * 255) / a;
      rgba[o + c] = Math.max(0, Math.min(255, Math.round(unmixed)));
    }
    rgba[o + 3] = Math.round(a * (rgba[o + 3] ?? 255));
  }

  return { removed };
}
