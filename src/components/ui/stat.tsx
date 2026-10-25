import { cn } from "@/lib/utils";

/**
 * Stat tile: a headline number with its label. A top rule connects tiles in a
 * row. Figures are tabular (`.numeric`) so they align and compare.
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
      className={cn("flex flex-col gap-2 border-t-2 border-[color:var(--fg)] pt-3 pb-4", className)}
    >
      <p className="text-[11px] font-medium tracking-[0.16em] text-[color:var(--fg-faint)] uppercase">
        {label}
      </p>
      <p className="numeric text-3xl leading-none font-medium">{value}</p>
      {hint ? <p className="text-xs text-[color:var(--fg-faint)]">{hint}</p> : null}
    </div>
  );
}
