import type { Route } from "next";
import Link from "next/link";

/**
 * A ranked list of single-series horizontal bars. Every value is printed as
 * text beside its bar (so the list is its own table view and needs no
 * tooltip); the bar is the accent, the text stays in text colours. A row with
 * an `href` is a link (name, value, and bar together: a 44px target).
 */
export function BarList({
  rows,
  label,
}: {
  rows: Array<{
    key: string;
    name: React.ReactNode;
    value: number;
    valueText: string;
    href?: Route;
  }>;
  /** Accessible name for the list, e.g. "Most worn". */
  label: string;
}) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <ol className="flex flex-col gap-1" aria-label={label}>
      {rows.map((r) => {
        const body = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
              <span className="min-w-0 truncate">{r.name}</span>
              <span className="numeric shrink-0 text-[color:var(--fg-muted)]">{r.valueText}</span>
            </div>
            <div aria-hidden className="h-2 w-full rounded-full bg-[color:var(--bg-sunken)]">
              <div
                className="h-full rounded-full bg-[color:var(--accent-color)]"
                style={{ width: `${max > 0 ? Math.max(2, (r.value / max) * 100) : 0}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link
                href={r.href}
                className="-mx-2 block min-h-11 rounded-md px-2 py-1.5 transition-colors hover:bg-[color:var(--bg-sunken)]/60"
              >
                {body}
              </Link>
            ) : (
              <div className="py-1.5">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
