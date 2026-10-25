/**
 * Resolves what a bottle should look like. Pure — no React, no Prisma.
 *
 * There are two sources of truth, in priority order:
 *
 *   1. Curated data on the `Fragrance` row (`bottleShape`, `glassColor`,
 *      `capColor`, `glassFinish`) — the real flacon's shape and colours.
 *   2. Derived data — silhouette inferred from the concentration, glass tint
 *      from the strongest accord.
 *
 * Curation will never be complete, so (2) is not a degraded mode; it is the
 * normal path for most of the catalogue and has to look deliberate on its own.
 * Every field falls back independently: a fragrance whose shape is curated but
 * whose colour is not still gets an accord tint.
 */
import { primaryAccordColor } from "./accord-colors";

export type Concentration = "PARFUM" | "EDP" | "EDT" | "EDC" | "COLOGNE" | "EXTRAIT" | "OTHER";
export type BottleShape = "RECTANGULAR" | "FLASK" | "CYLINDRICAL" | "TAPERED" | "SQUAT";
export type GlassFinish = "CLEAR" | "FROSTED" | "OPAQUE";

export type FragranceAppearanceInput = {
  concentration: Concentration;
  accords: Array<{ name: string; strength: number }>;
  bottleShape?: BottleShape | null;
  glassColor?: string | null;
  capColor?: string | null;
  glassFinish?: GlassFinish | null;
};

export type BottleAppearance = {
  shape: BottleShape;
  /** `#rrggbb`. On a CLEAR bottle this is the juice; otherwise the glass. */
  color: string;
  capColor: string;
  finish: GlassFinish;
  /** True when the silhouette came from curation rather than inference. */
  curatedShape: boolean;
};

const DEFAULT_CAP = "#1e1c17";

/**
 * Concentration → silhouette, used when no curated shape exists. It follows how
 * these actually get bottled: heavier concentrations ship in smaller, squatter,
 * sharper flacons; lighter ones get taller and softer.
 */
const SHAPE_BY_CONCENTRATION: Record<Concentration, BottleShape> = {
  EXTRAIT: "SQUAT",
  PARFUM: "SQUAT",
  EDP: "RECTANGULAR",
  EDT: "TAPERED",
  EDC: "CYLINDRICAL",
  COLOGNE: "CYLINDRICAL",
  OTHER: "RECTANGULAR",
};

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Curated colours arrive from a database column, so a typo or a legacy value
 * can reach the renderer. An invalid colour falls back rather than emitting
 * broken SVG.
 */
function validHex(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return HEX.test(trimmed) ? trimmed.toLowerCase() : null;
}

export function bottleAppearance(fragrance: FragranceAppearanceInput): BottleAppearance {
  const curatedShape = fragrance.bottleShape ?? null;
  return {
    shape: curatedShape ?? SHAPE_BY_CONCENTRATION[fragrance.concentration] ?? "RECTANGULAR",
    color: validHex(fragrance.glassColor) ?? primaryAccordColor(fragrance.accords),
    capColor: validHex(fragrance.capColor) ?? DEFAULT_CAP,
    finish: fragrance.glassFinish ?? "CLEAR",
    curatedShape: curatedShape !== null,
  };
}

// ---- Fill level -------------------------------------------------------------

/**
 * How full the bottle is, as 0..1, or null when it cannot be known.
 *
 * `remainingMl` is optional on a CollectionItem — plenty of people never track
 * it. Null means "don't draw a liquid line at all", which is different from
 * zero: an empty bottle is a real, displayable state and a bottle of unknown
 * level is not. Values above the bottle size are clamped rather than rejected,
 * since a 105ml reading on a 100ml bottle is a measurement artefact, not a bug
 * worth blanking the illustration over.
 */
export function fillRatio(bottleSizeMl: number | null, remainingMl: number | null): number | null {
  if (remainingMl === null || !Number.isFinite(remainingMl)) return null;
  if (bottleSizeMl === null || !Number.isFinite(bottleSizeMl) || bottleSizeMl <= 0) return null;
  return Math.min(1, Math.max(0, remainingMl / bottleSizeMl));
}

/** Plain-language fill level, for the text that sits beside the illustration. */
export function fillLabel(ratio: number | null): string | null {
  if (ratio === null) return null;
  if (ratio === 0) return "Empty";
  if (ratio < 0.15) return "Almost empty";
  if (ratio < 0.45) return "Running low";
  if (ratio < 0.9) return "Part used";
  return "Full";
}

/** Human-readable silhouette name, for assistive text and the shelf legend. */
export const SHAPE_LABEL: Record<BottleShape, string> = {
  RECTANGULAR: "rectangular flacon",
  FLASK: "flattened flask",
  CYLINDRICAL: "cylindrical column",
  TAPERED: "tapered flacon",
  SQUAT: "squat flacon",
};
