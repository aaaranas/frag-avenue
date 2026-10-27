/**
 * Colour for share images. Pure: the renderer samples pixels and passes them
 * in. Share images are artwork the user posts elsewhere, not app UI, so —
 * unlike the app's single-accent palette — their backgrounds may take colour
 * from the bottle photo.
 */

export type Rgb = readonly [number, number, number];

/** A soft field of colour: centre as fractions of width and height, radius of width. */
export type Aura = { x: number; y: number; r: number; color: string };

export type Palette = {
  top: string;
  bottom: string;
  /** Laid over the gradient, for depth. */
  auras: Aura[];
  /** The soft light behind the bottle. */
  glow: string;
  text: string;
  muted: string;
  /** Hairlines between stats. */
  rule: string;
};

export const BACKGROUNDS = [
  { id: "bottle", label: "Bottle" },
  { id: "midnight", label: "Midnight" },
  { id: "paper", label: "Paper" },
  { id: "accent", label: "Accent" },
] as const;
export type BackgroundId = (typeof BACKGROUNDS)[number]["id"];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** [h 0–360, s 0–1, l 0–1] */
export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
      : max === gn
        ? ((bn - rn) / d + 2) * 60
        : ((rn - gn) / d + 4) * 60;
  return [h, s, l];
}

/** Auras sit top right and bottom left, behind everything else. */
const auras = (topRight: string, bottomLeft: string): Aura[] => [
  { x: 0.92, y: 0.06, r: 1, color: topRight },
  { x: 0.04, y: 0.9, r: 0.9, color: bottomLeft },
];

/** A canvas colour string, alpha optional. */
export function hsla(h: number, s: number, l: number, a = 1): string {
  const r = (n: number) => Math.round(n * 10) / 10;
  return `hsla(${r(((h % 360) + 360) % 360)}, ${r(clamp(s, 0, 1) * 100)}%, ${r(clamp(l, 0, 1) * 100)}%, ${a})`;
}

export function hexToRgb(hex: string): Rgb | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * The colour a bottle photo "is": the average of its opaque pixels, weighted
 * towards saturated mid-tones, so a blue bottle with a white cap and dark
 * shadows reads as its blue. Null when nothing is opaque.
 */
export function dominantColor(rgba: ArrayLike<number>): Rgb | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3]! < 200) continue;
    const px: Rgb = [rgba[i]!, rgba[i + 1]!, rgba[i + 2]!];
    const [, s, l] = rgbToHsl(px);
    const w = 0.05 + s * (1 - Math.abs(l - 0.5) * 1.6);
    if (w <= 0) continue;
    r += px[0] * w;
    g += px[1] * w;
    b += px[2] * w;
    total += w;
  }
  return total > 0 ? [Math.round(r / total), Math.round(g / total), Math.round(b / total)] : null;
}

/** A deep two-stop gradient and a glow in the colour's hue; charcoal for greys. */
function tinted(color: Rgb): Palette {
  const [h, s] = rgbToHsl(color);
  const light = {
    text: "#ffffff",
    muted: "rgba(255,255,255,0.72)",
    rule: "rgba(255,255,255,0.22)",
  };
  if (s < 0.12) {
    return {
      top: hsla(h, 0, 0.24),
      bottom: hsla(h, 0, 0.07),
      auras: auras(hsla(h, 0, 0.6, 0.16), hsla(h, 0, 0.45, 0.12)),
      glow: hsla(h, 0, 0.75, 0.22),
      ...light,
    };
  }
  const sat = clamp(s * 1.1, 0.3, 0.7);
  return {
    top: hsla(h, sat, 0.27),
    bottom: hsla(h + 12, sat * 0.85, 0.07),
    auras: auras(hsla(h - 12, sat, 0.48, 0.42), hsla(h + 10, sat * 0.9, 0.36, 0.32)),
    glow: hsla(h, Math.min(0.9, sat + 0.15), 0.6, 0.55),
    ...light,
  };
}

/**
 * The palette for a background choice. `bottle` is the photo's colour (or
 * null without a photo, which falls back to the accent); `accent` is the app's
 * accent colour.
 */
export function paletteFor(background: BackgroundId, bottle: Rgb | null, accent: Rgb): Palette {
  const [h, s] = rgbToHsl(bottle ?? accent);
  switch (background) {
    case "bottle":
      return tinted(bottle ?? accent);
    case "accent":
      return tinted(accent);
    case "midnight":
      return {
        top: hsla(240, 0.12, 0.1),
        bottom: hsla(240, 0.15, 0.03),
        auras: auras(
          hsla(h, clamp(s, 0, 0.6), 0.45, 0.2),
          hsla(h + 24, clamp(s, 0, 0.5), 0.4, 0.12),
        ),
        glow: hsla(h, clamp(s, 0, 0.7), 0.5, 0.35),
        text: "#f4f4f5",
        muted: "rgba(244,244,245,0.68)",
        rule: "rgba(255,255,255,0.18)",
      };
    case "paper":
      return {
        top: hsla(36, 0.38, 0.95),
        bottom: hsla(34, 0.24, 0.86),
        auras: auras(hsla(h, clamp(s * 0.7, 0, 0.55), 0.84, 0.5), hsla(28, 0.45, 0.8, 0.4)),
        glow: hsla(h, clamp(s * 0.6, 0, 0.5), 0.72, 0.45),
        text: "#1a1714",
        muted: "rgba(26,23,20,0.64)",
        rule: "rgba(26,23,20,0.16)",
      };
  }
}
