import { cn } from "@/lib/utils";

/**
 * Editorial stat. A hairline top rule connects stats in a row.
 *
 * The number is set in the sans, not the display serif: these are figures you
 * read and compare, and Cormorant's old-style numerals turned "127" into
 * something that read as "I 27". See `.numeric` in globals.css.
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
