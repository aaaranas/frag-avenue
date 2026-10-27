import { SHARE_FORMATS, type ShareCardData, type ShareFormat } from "./share-card";
import { dominantColor, hexToRgb, paletteFor, type BackgroundId, type Rgb } from "./palette";
import { fitText } from "./text-fit";
import { erodeAlpha } from "./defringe";

/**
 * Draws a share image on a canvas and returns it as a PNG. Runs in the
 * browser: it uses the app's own font and the catalogue photo (same origin, so
 * the canvas stays exportable), and needs no server.
 *
 * Layout, top to bottom: the app mark, the bottle (with a soft glow), then the
 * house, the name, when it was worn, the stat strip, the check-in summary, and
 * the wearer's handle. The text block is measured first and anchored to the
 * bottom; the bottle gets whatever height is left.
 */

type Spec = {
  /** Side margin. */
  pad: number;
  /** Where content starts and ends: a story keeps clear of Instagram's own UI. */
  top: number;
  bottom: number;
  mark: number;
  wordmark: number;
  house: number;
  name: number;
  nameMin: number;
  when: number;
  statLabel: number;
  statValue: number;
  summary: number;
  footer: number;
  bottleMax: number;
};

const SPECS: Record<ShareFormat, Spec> = {
  story: {
    pad: 96,
    // Instagram lays its progress bar and name over the top 250px of a story,
    // and the reply bar over the bottom 250px.
    top: 250,
    bottom: 250,
    mark: 72,
    wordmark: 40,
    house: 34,
    name: 124,
    nameMin: 72,
    when: 34,
    statLabel: 25,
    statValue: 56,
    summary: 30,
    footer: 30,
    bottleMax: 900,
  },
  post: {
    pad: 84,
    top: 84,
    bottom: 84,
    mark: 60,
    wordmark: 34,
    house: 30,
    name: 100,
    nameMin: 60,
    when: 30,
    statLabel: 22,
    statValue: 48,
    summary: 27,
    footer: 27,
    bottleMax: 600,
  },
};

/** A small photo drawn up to this much larger than its pixels looks soft. */
const MAX_UPSCALE = 1.6;
const FALLBACK_ACCENT: Rgb = [227, 166, 74];
const MARK_RULE = "#e3a64a";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** The photo without the pale rim its cutout left (see erodeAlpha). */
function defringe(img: HTMLImageElement): CanvasImageSource {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext("2d", { willReadFrequently: true });
  if (!x) return img;
  x.drawImage(img, 0, 0);
  const data = x.getImageData(0, 0, c.width, c.height);
  data.data.set(erodeAlpha(data.data, c.width, c.height));
  x.putImageData(data, 0, 0);
  return c;
}

/** Wider gaps around the " · " separators, which read cramped at this size. */
const spaced = (text: string) => text.replaceAll(" · ", "\u2002·\u2002");

function photoColor(img: HTMLImageElement): Rgb | null {
  const w = 48;
  const h = Math.max(1, Math.round((w * img.naturalHeight) / img.naturalWidth));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true });
  if (!x) return null;
  x.drawImage(img, 0, 0, w, h);
  return dominantColor(x.getImageData(0, 0, w, h).data);
}

/** Canvas features newer than the rest: used when present, skipped otherwise. */
type ModernContext = CanvasRenderingContext2D & {
  letterSpacing?: string;
  fontStretch?: string;
};

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

export async function renderShareCard(
  card: ShareCardData,
  format: ShareFormat,
  background: BackgroundId,
): Promise<Blob> {
  const { width: W, height: H } = SHARE_FORMATS[format];
  const spec = SPECS[format];
  const family = cssVar("--font-instrument") || "ui-sans-serif, system-ui, sans-serif";
  const font = (weight: number, size: number) => `${weight} ${size}px ${family}`;
  // Wait for the app font in the weights drawn below, by its own name only:
  // next/font's metric fallback is `local("Arial")`, which fails to load where
  // there is no Arial (most Android phones) and would reject the whole load.
  // A font that still fails just leaves the fallback in place.
  const primary = family.split(",")[0]!.trim();
  const sample = `${card.house}${card.name}${card.when}${card.summary ?? ""}0123456789`;
  await Promise.allSettled(
    [500, 600, 700].map((w) => document.fonts.load(`${w} 48px ${primary}`, sample)),
  );

  const photo = card.imagePath ? await loadImage(card.imagePath).catch(() => null) : null;
  const accent = hexToRgb(cssVar("--accent-color")) ?? FALLBACK_ACCENT;
  const palette = paletteFor(background, photo ? photoColor(photo) : null, accent);
  const light = background === "paper";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d") as ModernContext | null;
  if (!ctx) throw new Error("No 2D canvas");
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  const cx = W / 2;
  const contentW = W - spec.pad * 2;

  const tracking = (px: number) => {
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
  };
  const stretch = (value: "normal" | "semi-condensed") => {
    if ("fontStretch" in ctx) ctx.fontStretch = value;
  };
  const measureAt = (weight: number, condensed: boolean) => (text: string, size: number) => {
    ctx.font = font(weight, size);
    stretch(condensed ? "semi-condensed" : "normal");
    return ctx.measureText(text).width;
  };

  // Background: a two-stop gradient with soft fields of colour over it (and a
  // vignette once the bottle is down).
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, palette.top);
  bg.addColorStop(1, palette.bottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const a of palette.auras) glow(ctx, a.x * W, a.y * H, a.r * W, a.color);

  // ---- Measure the text block (bottom-anchored) ----------------------------
  const houseTracking = 0.18;
  const house = fitText(
    (text, size) => {
      ctx.font = font(600, size);
      stretch("normal");
      tracking(size * houseTracking);
      return ctx.measureText(text).width;
    },
    card.house.toUpperCase(),
    { maxWidth: contentW, maxSize: spec.house, minSize: Math.round(spec.house * 0.7), maxLines: 1 },
  );
  tracking(0);
  const name = fitText(measureAt(700, true), card.name, {
    maxWidth: contentW,
    maxSize: spec.name,
    minSize: spec.nameMin,
    maxLines: 2,
  });
  const columns = card.stats.length;
  const columnW = contentW / Math.max(1, columns);
  let valueSize = spec.statValue;
  const valueFits = (size: number) =>
    card.stats.every((s) => measureAt(600, false)(s.value, size) <= columnW - 40);
  while (valueSize > spec.statLabel + 4 && !valueFits(valueSize)) valueSize -= 2;

  const houseH = spec.house * 1.25;
  const nameLineH = name.size * 1.02;
  const whenH = spec.when * 1.3;
  const statsH = spec.statLabel * 1.35 + 12 + valueSize * 1.15;
  const summaryH = card.summary ? spec.summary * 1.35 : 0;
  const gaps = {
    houseName: spec.house * 0.5,
    nameWhen: spec.when * 0.55,
    whenStats: spec.statValue * 0.95,
    statsSummary: card.summary ? spec.summary * 0.9 : 0,
  };
  const blockH =
    houseH +
    gaps.houseName +
    nameLineH * name.lines.length +
    gaps.nameWhen +
    whenH +
    gaps.whenStats +
    statsH +
    gaps.statsSummary +
    summaryH;
  const footerH = card.handle ? spec.footer * 1.3 + spec.footer * 1.6 : 0;
  const blockTop = H - spec.bottom - footerH - blockH;

  // ---- Header: the app mark and wordmark, centred ---------------------------
  ctx.font = font(600, spec.wordmark);
  stretch("normal");
  tracking(0);
  const wordW = ctx.measureText("Frag Avenue").width;
  const gap = spec.mark * 0.28;
  const headerX = cx - (spec.mark + gap + wordW) / 2;
  drawMark(ctx, headerX, spec.top, spec.mark, light);
  ctx.fillStyle = palette.text;
  ctx.textAlign = "left";
  ctx.fillText(
    "Frag Avenue",
    headerX + spec.mark + gap,
    spec.top + (spec.mark - spec.wordmark) / 2,
  );
  ctx.textAlign = "center";

  // ---- The bottle, in the space between header and text ---------------------
  const areaTop = spec.top + spec.mark + spec.pad * 0.6;
  const areaBottom = blockTop - spec.pad * 0.6;
  const areaH = Math.max(0, areaBottom - areaTop);
  if (photo) {
    const scale = Math.min(
      areaH / photo.naturalHeight,
      contentW / photo.naturalWidth,
      spec.bottleMax / photo.naturalHeight,
      MAX_UPSCALE,
    );
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    const dx = cx - dw / 2;
    const dy = areaTop + (areaH - dh) / 2;
    glow(ctx, cx, dy + dh * 0.55, Math.max(dw, dh) * 0.85, palette.glow);
    ctx.save();
    ctx.shadowColor = light ? "rgba(60,40,20,0.28)" : "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 28;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(defringe(photo), dx, dy, dw, dh);
    ctx.restore();
  } else {
    const gh = Math.min(areaH, spec.bottleMax * 0.6);
    glow(ctx, cx, areaTop + areaH / 2, gh * 0.8, palette.glow);
    drawBottleOutline(ctx, cx, areaTop + (areaH - gh) / 2, gh, palette.text);
  }

  vignette(ctx, W, H, light);

  // ---- Text block -------------------------------------------------------------
  let y = blockTop;
  ctx.fillStyle = palette.muted;
  ctx.font = font(600, house.size);
  stretch("normal");
  tracking(house.size * houseTracking);
  ctx.fillText(house.lines[0] ?? "", cx, y);
  tracking(0);
  y += houseH + gaps.houseName;

  ctx.fillStyle = palette.text;
  ctx.font = font(700, name.size);
  stretch("semi-condensed");
  for (const line of name.lines) {
    ctx.fillText(line, cx, y);
    y += nameLineH;
  }
  stretch("normal");
  y += gaps.nameWhen;

  ctx.fillStyle = palette.muted;
  ctx.font = font(500, spec.when);
  ctx.fillText(spaced(card.when), cx, y);
  y += whenH + gaps.whenStats;

  // Stat strip: equal columns, hairlines between them.
  const statsTop = y;
  card.stats.forEach((s, i) => {
    const colX = spec.pad + columnW * (i + 0.5);
    ctx.fillStyle = palette.muted;
    ctx.font = font(600, spec.statLabel);
    tracking(spec.statLabel * 0.14);
    ctx.fillText(s.label.toUpperCase(), colX, statsTop);
    tracking(0);
    ctx.fillStyle = palette.text;
    ctx.font = font(600, valueSize);
    ctx.fillText(s.value, colX, statsTop + spec.statLabel * 1.35 + 12);
    if (i > 0) {
      ctx.fillStyle = palette.rule;
      ctx.fillRect(spec.pad + columnW * i - 1, statsTop, 2, statsH);
    }
  });
  y += statsH + gaps.statsSummary;

  if (card.summary) {
    ctx.fillStyle = palette.muted;
    ctx.font = font(500, spec.summary);
    ctx.fillText(spaced(card.summary), cx, y);
  }

  if (card.handle) {
    ctx.fillStyle = palette.muted;
    ctx.font = font(600, spec.footer);
    ctx.fillText(card.handle, cx, H - spec.bottom - spec.footer * 1.3);
  }

  return toBlob(canvas);
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  // Fade to the same colour, transparent: fading to transparent black greys the edge.
  g.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, light: boolean) {
  const g = ctx.createRadialGradient(
    w / 2,
    h * 0.45,
    Math.min(w, h) * 0.35,
    w / 2,
    h / 2,
    h * 0.75,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, light ? "rgba(80,60,40,0.12)" : "rgba(0,0,0,0.28)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** The app icon's mark (src/components/brand/app-mark.tsx), on a 512 grid. */
function drawMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  light: boolean,
) {
  const u = size / 512;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.22);
  ctx.fillStyle = "#111111";
  ctx.fill();
  ctx.lineWidth = Math.max(1, size / 40);
  ctx.strokeStyle = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)";
  ctx.stroke();
  const rect = (rx: number, ry: number, rw: number, rh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + rx * u, y + ry * u, rw * u, rh * u);
  };
  rect(168, 108, 56, 248, "#fafafa");
  rect(168, 108, 176, 52, "#fafafa");
  rect(168, 212, 136, 48, "#fafafa");
  rect(168, 384, 176, 20, MARK_RULE);
  ctx.restore();
}

/** A simple bottle silhouette for fragrances without a photo. */
function drawBottleOutline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  h: number,
  color: string,
) {
  const w = h * 0.62;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(4, h / 55);
  ctx.lineJoin = "round";
  const capW = w * 0.42;
  const capH = h * 0.14;
  ctx.beginPath();
  ctx.roundRect(cx - capW / 2, top, capW, capH, capH * 0.18);
  ctx.stroke();
  const neckW = w * 0.24;
  ctx.beginPath();
  ctx.moveTo(cx - neckW / 2, top + capH);
  ctx.lineTo(cx - neckW / 2, top + capH + h * 0.05);
  ctx.moveTo(cx + neckW / 2, top + capH);
  ctx.lineTo(cx + neckW / 2, top + capH + h * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, top + capH + h * 0.05, w, h - capH - h * 0.05, w * 0.16);
  ctx.stroke();
  ctx.restore();
}
