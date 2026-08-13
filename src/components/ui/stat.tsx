import { cn } from "@/lib/utils";

/**
 * Editorial stat. Emphasises the number in serif, label in tracked caps.
 * A hairline top rule connects stats in a row.
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
    <div className={cn("flex flex-col gap-1 border-t border-[color:var(--rule)] py-4", className)}>
      <p className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
        {label}
      </p>
      <p className="font-serif text-3xl leading-none tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[color:var(--fg-faint)]">{hint}</p> : null}
    </div>
  );
}
