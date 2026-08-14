import { useId } from "react";
import { cn } from "@/lib/utils";

type Concentration = "PARFUM" | "EDP" | "EDT" | "EDC" | "COLOGNE" | "EXTRAIT" | "OTHER";

type Props = {
  color: string;
  concentration?: Concentration;
  size?: number;
  className?: string;
};

/**
 * Silhouette spec per concentration. Every bottle stands on the same baseline
 * (y = BASELINE) so a row of them aligns on the shelf rule regardless of height.
 *
 * The shapes follow how these actually get bottled: extrait and parfum ship in
 * small, squat, sharp-cornered flacons; EDP is the classic tall rectangle;
 * EDT/EDC get wider and softer; cologne is the big rounded splash bottle.
 */
type Spec = {
  width: number;
  radius: number; // bottom corner radius
  shoulderY: number; // top of the glass body
  shoulderR: number; // shoulder curve radius
  capW: number;
  capH: number;
};

const BASELINE = 160;
const NECK_H = 6;

const SPECS: Record<Concentration, Spec> = {
  EXTRAIT: { width: 46, radius: 1.5, shoulderY: 80, shoulderR: 2, capW: 20, capH: 16 },
  PARFUM: { width: 52, radius: 2.5, shoulderY: 72, shoulderR: 3, capW: 22, capH: 18 },
  EDP: { width: 58, radius: 6, shoulderY: 46, shoulderR: 7, capW: 24, capH: 24 },
  EDT: { width: 68, radius: 11, shoulderY: 54, shoulderR: 13, capW: 26, capH: 21 },
  EDC: { width: 73, radius: 15, shoulderY: 63, shoulderR: 18, capW: 27, capH: 18 },
  COLOGNE: { width: 76, radius: 19, shoulderY: 58, shoulderR: 22, capW: 28, capH: 17 },
  OTHER: { width: 60, radius: 8, shoulderY: 56, shoulderR: 8, capW: 24, capH: 20 },
};

/**
 * Editorial SVG perfume bottle. Deterministic per fragrance — the glass
 * color comes from the strongest accord (see `primaryAccordColor`), and the
 * silhouette comes from the concentration.
 *
 * Not a "3D model" — a stylised product illustration with real light logic:
 * a subtle top→bottom depth gradient, a left-edge shine strip, an inner
 * shadow along the right, a dark screw cap, and a cream label plate.
 * Restrained, editorial, and it renders in a couple hundred bytes.
 */
export function Bottle({ color, concentration = "EDP", size = 140, className }: Props) {
  const uid = useId().replace(/[:]/g, "");
  const glassId = `glass-${uid}`;
  const shineId = `shine-${uid}`;
  const shadowId = `shadow-${uid}`;

  const spec = SPECS[concentration] ?? SPECS.OTHER;
  const { width, radius, shoulderY, shoulderR, capW, capH } = spec;

  const leftX = 50 - width / 2;
  const rightX = 50 + width / 2;
  const bodyH = BASELINE - shoulderY;

  const capY = shoulderY - NECK_H - capH;
  const neckW = Math.min(capW - 8, width - 10);

  // Label plate scales with the body so squat flacons don't get a giant plate
  const labelW = Math.round(width * 0.62);
  const labelH = Math.round(Math.min(42, bodyH * 0.46));
  const labelX = 50 - labelW / 2;
  const labelY = shoulderY + bodyH * 0.36;

  const bodyPath =
    `M ${leftX} ${shoulderY + shoulderR}` +
    ` Q ${leftX} ${shoulderY} ${leftX + shoulderR} ${shoulderY}` +
    ` L ${rightX - shoulderR} ${shoulderY}` +
    ` Q ${rightX} ${shoulderY} ${rightX} ${shoulderY + shoulderR}` +
    ` L ${rightX} ${BASELINE - radius}` +
    ` Q ${rightX} ${BASELINE} ${rightX - radius} ${BASELINE}` +
    ` L ${leftX + radius} ${BASELINE}` +
    ` Q ${leftX} ${BASELINE} ${leftX} ${BASELINE - radius} Z`;

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
      </defs>

      {/* Cast shadow beneath bottle — tracks the body width */}
      <ellipse cx="50" cy={BASELINE + 3} rx={width / 2 - 2} ry="2.5" fill="rgba(0,0,0,0.18)" />

      {/* Cap */}
      <rect x={50 - capW / 2} y={capY} width={capW} height={capH} rx="2" fill="#1e1c17" />
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
      <path d={bodyPath} fill={color} fillOpacity="0.82" />

      {/* Glass depth overlay */}
      <path d={bodyPath} fill={`url(#${glassId})`} />

      {/* Right-edge inner shadow */}
      <rect
        x={rightX - 12}
        y={shoulderY + shoulderR}
        width="12"
        height={BASELINE - shoulderY - shoulderR - radius}
        fill={`url(#${shadowId})`}
      />

      {/* Left-edge shine */}
      <rect
        x={leftX + 4}
        y={shoulderY + shoulderR + 3}
        width="6"
        height={Math.max(0, bodyH - shoulderR - radius - 6)}
        rx="2"
        fill={`url(#${shineId})`}
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
      <path d={bodyPath} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="0.5" />
    </svg>
  );
}
