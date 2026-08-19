import { useId } from "react";
import { cn } from "@/lib/utils";
import type { BottleShape, GlassFinish } from "@/lib/bottle-appearance";

type Props = {
  /** `#rrggbb`. On a CLEAR bottle this reads as the juice; otherwise the glass. */
  color: string;
  shape?: BottleShape;
  capColor?: string;
  finish?: GlassFinish;
  /**
   * 0..1 liquid level, or null/undefined when unknown. Null draws no fill line
   * at all — which is a different statement from 0, an empty bottle.
   */
  fillRatio?: number | null;
  size?: number;
  className?: string;
};

/**
 * Silhouette spec per shape. Every bottle stands on the same baseline
 * (y = BASELINE) so a row of them aligns on the shelf rule regardless of height.
 *
 * `topInset` narrows the shoulder relative to the base and `taperH` sets how
 * far down the taper runs; both are 0 for straight-sided bottles, in which case
 * the path collapses to the plain rounded rectangle it was before.
 */
type Spec = {
  width: number;
  radius: number; // bottom corner radius
  shoulderY: number; // top of the glass body
  shoulderR: number; // shoulder curve radius
  capW: number;
  capH: number;
  topInset: number; // per-side narrowing at the shoulder
  taperH: number; // vertical run of the taper
};

const BASELINE = 160;
const NECK_H = 6;

const SPECS: Record<BottleShape, Spec> = {
  SQUAT: {
    width: 54,
    radius: 2,
    shoulderY: 78,
    shoulderR: 3,
    capW: 22,
    capH: 17,
    topInset: 0,
    taperH: 0,
  },
  RECTANGULAR: {
    width: 58,
    radius: 6,
    shoulderY: 46,
    shoulderR: 7,
    capW: 24,
    capH: 24,
    topInset: 0,
    taperH: 0,
  },
  FLASK: {
    width: 72,
    radius: 16,
    shoulderY: 58,
    shoulderR: 20,
    capW: 26,
    capH: 19,
    topInset: 0,
    taperH: 0,
  },
  TAPERED: {
    width: 68,
    radius: 10,
    shoulderY: 50,
    shoulderR: 6,
    capW: 24,
    capH: 21,
    topInset: 9,
    taperH: 26,
  },
  CYLINDRICAL: {
    width: 56,
    radius: 14,
    shoulderY: 44,
    shoulderR: 16,
    capW: 26,
    capH: 22,
    topInset: 0,
    taperH: 0,
  },
};

const DEFAULT_CAP = "#1e1c17";

/**
 * How much of the glass colour survives, and how strongly the empty part of the
 * bottle is washed out. You can read the level through clear glass; you very
 * nearly cannot through lacquered glass, and pretending otherwise would make
 * the illustration lie.
 */
const FINISH: Record<GlassFinish, { glassOpacity: number; emptyWash: number }> = {
  CLEAR: { glassOpacity: 0.72, emptyWash: 0.58 },
  FROSTED: { glassOpacity: 0.82, emptyWash: 0.4 },
  OPAQUE: { glassOpacity: 0.95, emptyWash: 0.16 },
};

function bodyPath(spec: Spec): string {
  const { width, radius, shoulderY, shoulderR, topInset, taperH } = spec;
  const leftX = 50 - width / 2;
  const rightX = 50 + width / 2;
  const topLeftX = leftX + topInset;
  const topRightX = rightX - topInset;
  // Where the straight sides stop and the taper begins. Without a taper this is
  // the shoulder itself, so the two "L" segments below are zero-length.
  const taperY = shoulderY + taperH;

  return (
    `M ${leftX} ${BASELINE - radius}` +
    ` L ${leftX} ${taperY}` +
    ` L ${topLeftX} ${shoulderY + shoulderR}` +
    ` Q ${topLeftX} ${shoulderY} ${topLeftX + shoulderR} ${shoulderY}` +
    ` L ${topRightX - shoulderR} ${shoulderY}` +
    ` Q ${topRightX} ${shoulderY} ${topRightX} ${shoulderY + shoulderR}` +
    ` L ${rightX} ${taperY}` +
    ` L ${rightX} ${BASELINE - radius}` +
    ` Q ${rightX} ${BASELINE} ${rightX - radius} ${BASELINE}` +
    ` L ${leftX + radius} ${BASELINE}` +
    ` Q ${leftX} ${BASELINE} ${leftX} ${BASELINE - radius} Z`
  );
}

/**
 * Editorial SVG perfume bottle. Deterministic per fragrance — see
 * `bottleAppearance()` for where the shape and colours come from.
 *
 * Not a "3D model" — a stylised product illustration with real light logic:
 * a top→bottom depth gradient, a left-edge shine strip, an inner shadow along
 * the right, a screw cap, and a cream label plate. Restrained, editorial, and
 * it renders in a couple hundred bytes.
 *
 * Always `aria-hidden`: it sits inside a link or button that carries the brand,
 * name, and (since the fill level became meaningful) a text equivalent of what
 * the illustration is showing.
 */
export function Bottle({
  color,
  shape = "RECTANGULAR",
  capColor = DEFAULT_CAP,
  finish = "CLEAR",
  fillRatio = null,
  size = 140,
  className,
}: Props) {
  const uid = useId().replace(/[:]/g, "");
  const glassId = `glass-${uid}`;
  const shineId = `shine-${uid}`;
  const shadowId = `shadow-${uid}`;
  const clipId = `clip-${uid}`;

  const spec = SPECS[shape] ?? SPECS.RECTANGULAR;
  const { width, radius, shoulderY, shoulderR, capW, capH, topInset } = spec;

  const leftX = 50 - width / 2;
  const rightX = 50 + width / 2;
  const bodyH = BASELINE - shoulderY;
  const path = bodyPath(spec);

  const capY = shoulderY - NECK_H - capH;
  const neckW = Math.min(capW - 8, width - topInset * 2 - 10);

  const { glassOpacity, emptyWash } = FINISH[finish] ?? FINISH.CLEAR;

  // The liquid surface. Clamped into the body so a full bottle's meniscus does
  // not float above the shoulder.
  const hasFill = fillRatio !== null && fillRatio !== undefined;
  const clamped = hasFill ? Math.min(1, Math.max(0, fillRatio)) : 0;
  const fillY = shoulderY + bodyH * (1 - clamped);
  // Height of the washed-out air above the surface. The extra unit hides a seam
  // where the wash meets the shoulder curve, and is dropped at exactly full so
  // a brimming bottle is not veiled by a sliver of haze.
  const airH = fillY - shoulderY;
  const washH = airH <= 0 ? 0 : airH + 1;

  // Label plate scales with the body so squat flacons don't get a giant plate
  const labelW = Math.round((width - topInset * 2) * 0.62);
  const labelH = Math.round(Math.min(42, bodyH * 0.46));
  const labelX = 50 - labelW / 2;
  const labelY = shoulderY + bodyH * 0.36;

  return (
    <svg
      viewBox="0 0 100 170"
      width={size}
      height={size * (170 / 100)}
      aria-hidden
      className={cn("select-none", className)}
    >
      <defs>
        {/* Glass depth: cool highlight top-left → warm shadow bottom-right */}
        <linearGradient id={glassId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
        </linearGradient>
        {/* Left-edge shine strip */}
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {/* Right-edge inner shadow */}
        <linearGradient id={shadowId} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0.22)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        {/* Confines the liquid wash to the silhouette */}
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>

      {/* Cast shadow beneath bottle — tracks the body width */}
      <ellipse cx="50" cy={BASELINE + 3} rx={width / 2 - 2} ry="2.5" fill="rgba(0,0,0,0.18)" />

      {/* Cap */}
      <rect x={50 - capW / 2} y={capY} width={capW} height={capH} rx="2" fill={capColor} />
      {/* Cap highlight */}
      <rect
        x={50 - capW / 2 + 2}
        y={capY + 2}
        width={Math.max(3, capW * 0.22)}
        height={capH - 4}
        rx="1"
        fill="rgba(255,255,255,0.14)"
      />

      {/* Neck collar */}
      <rect x={50 - neckW / 2} y={capY + capH} width={neckW} height={NECK_H + 1} fill="#2a2620" />

      {/* Bottle body — glass color */}
      <path d={path} fill={color} fillOpacity={glassOpacity} />

      {/* Liquid level: the region ABOVE the surface is washed out, which reads as
          air in the bottle and works whichever direction the glass colour goes. */}
      {hasFill ? (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x={leftX}
            y={shoulderY - 1}
            width={width}
            height={washH}
            fill="rgba(255,255,255,1)"
            fillOpacity={emptyWash}
          />
          {/* Meniscus — only meaningful when there is some air above it */}
          {clamped > 0.02 && clamped < 0.995 ? (
            <rect x={leftX} y={fillY - 0.75} width={width} height="1.5" fill="rgba(0,0,0,0.16)" />
          ) : null}
        </g>
      ) : null}

      {/* Glass depth overlay */}
      <path d={path} fill={`url(#${glassId})`} />

      {/* Right-edge inner shadow */}
      <rect
        x={rightX - 12}
        y={shoulderY + shoulderR}
        width="12"
        height={BASELINE - shoulderY - shoulderR - radius}
        fill={`url(#${shadowId})`}
        clipPath={`url(#${clipId})`}
      />

      {/* Left-edge shine */}
      <rect
        x={leftX + 4}
        y={shoulderY + shoulderR + 3}
        width="6"
        height={Math.max(0, bodyH - shoulderR - radius - 6)}
        rx="2"
        fill={`url(#${shineId})`}
        clipPath={`url(#${clipId})`}
      />

      {/* Label plate */}
      <rect
        x={labelX}
        y={labelY}
        width={labelW}
        height={labelH}
        fill="#f5f2ea"
        opacity="0.94"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth="0.5"
      />
      {/* Label rule lines (representing brand + line) */}
      <line
        x1={labelX + labelW * 0.12}
        y1={labelY + labelH * 0.36}
        x2={labelX + labelW * 0.88}
        y2={labelY + labelH * 0.36}
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="0.5"
      />
      <line
        x1={labelX + labelW * 0.2}
        y1={labelY + labelH * 0.58}
        x2={labelX + labelW * 0.8}
        y2={labelY + labelH * 0.58}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.5"
      />
      <line
        x1={labelX + labelW * 0.28}
        y1={labelY + labelH * 0.78}
        x2={labelX + labelW * 0.72}
        y2={labelY + labelH * 0.78}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.5"
      />

      {/* Outer bottle hairline */}
      <path d={path} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="0.5" />
    </svg>
  );
}
