import { cn } from "@/lib/utils";

/**
 * Stat tile: a label over a headline number. Figures are tabular (`.numeric`)
 * so tiles in a row align. The label comes first in the DOM so the tile reads
 * "Wears 30" to assistive tech, as it does on screen.
 */
export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Values sit on the bottom edge so a row lines up even when one label
        // wraps to two lines.
        "flex flex-col justify-between gap-2 rounded-xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-3 sm:p-4",
        className,
      )}
    >
      <p className="text-xs leading-tight font-medium text-[color:var(--fg-muted)]">{label}</p>
      <div>
        <p className="numeric text-[1.75rem] leading-none font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-xs text-[color:var(--fg-faint)]">{hint}</p> : null}
      </div>
    </div>
  );
}
