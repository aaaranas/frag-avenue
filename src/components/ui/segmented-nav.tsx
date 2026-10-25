import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type Segment<T extends string> = {
  href: Route<T>;
  label: React.ReactNode;
  current: boolean;
};

/**
 * A segmented control made of links — for choices that are pages (a stats
 * range, sign in vs create account), so they work without JS, are bookmarkable,
 * and the current one carries aria-current. Equal-width segments on a sunken
 * track; the current segment is lifted, not coloured, so the accent stays for
 * actions.
 */
export function SegmentedNav<T extends string>({
  label,
  segments,
  className,
}: {
  label: string;
  segments: Segment<T>[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex rounded-[calc(var(--radius)+2px)] bg-[color:var(--bg-sunken)] p-1 ring-1 ring-[color:var(--rule)] ring-inset">
        {segments.map((s, i) => (
          <li key={i} className="flex min-w-0 flex-1">
            <Link
              href={s.href}
              aria-current={s.current ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center rounded-md px-3 text-sm transition-colors",
                s.current
                  ? "bg-[color:var(--bg-elev)] font-semibold text-[color:var(--fg)] shadow-sm ring-1 ring-[color:var(--rule)]"
                  : "font-medium text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
              )}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
