import { cn } from "@/lib/utils";

type Kind = "BOTTLE" | "DECANT" | "SAMPLE" | "WISHLIST";

/**
 * Wireframe bottle outline. The silhouette says what kind of item it is
 * (full bottle, slim decant, small sample vial, dashed for wishlist); the
 * accent liquid says how full it is. Purely decorative — callers always print
 * the kind and fill level as text next to it.
 */
const SHAPES: Record<
  Kind,
  { cap: [number, number, number, number]; body: [number, number, number, number]; r: number }
> = {
  // [x, y, width, height] in a 40×64 box; every body ends at y = 60.
  BOTTLE: { cap: [13, 3, 14, 9], body: [5, 16, 30, 44], r: 5 },
  DECANT: { cap: [16, 3, 8, 9], body: [12, 14, 16, 46], r: 3 },
  SAMPLE: { cap: [16, 22, 8, 7], body: [15, 31, 10, 29], r: 2 },
  WISHLIST: { cap: [13, 3, 14, 9], body: [5, 16, 30, 44], r: 5 },
};

export function BottleGlyph({
  kind = "BOTTLE",
  fillRatio = null,
  className,
}: {
  kind?: Kind;
  /** 0..1, or null for unknown (no liquid drawn). Ignored for wishlist. */
  fillRatio?: number | null;
  className?: string;
}) {
  const { cap, body, r } = SHAPES[kind];
  const [bx, by, bw, bh] = body;
  const dashed = kind === "WISHLIST";
  const level = !dashed && fillRatio !== null ? Math.min(1, Math.max(0, fillRatio)) : null;
  // Liquid sits inside the 1.5px stroke.
  const inset = 1.5;
  const liquidH = level !== null ? (bh - inset * 2) * level : 0;

  return (
    <svg
      viewBox="0 0 40 64"
      aria-hidden
      className={cn("text-[color:var(--fg-muted)]", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeDasharray={dashed ? "3 2.5" : undefined}
    >
      <rect x={cap[0]} y={cap[1]} width={cap[2]} height={cap[3]} rx={1.5} />
      <line x1={20} y1={cap[1] + cap[3]} x2={20} y2={by} />
      {level !== null && liquidH > 0 ? (
        <rect
          x={bx + inset}
          y={by + bh - inset - liquidH}
          width={bw - inset * 2}
          height={liquidH}
          rx={Math.max(0, r - inset)}
          stroke="none"
          className="fill-[color:var(--accent-color)]"
        />
      ) : null}
      <rect x={bx} y={by} width={bw} height={bh} rx={r} />
    </svg>
  );
}
