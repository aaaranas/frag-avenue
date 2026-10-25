import { cn } from "@/lib/utils";

export type WearStat = { label: string; value: string };

/**
 * The Strava-style strip on a wear: small labels over values, in equal columns
 * divided by hairlines. A definition list, so each value is announced with its
 * label.
 */
export function WearStats({ stats, className }: { stats: WearStat[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid divide-x divide-[color:var(--rule)]",
        stats.length === 4
          ? "grid-cols-[repeat(4,minmax(0,1fr))]"
          : stats.length === 3
            ? "grid-cols-[repeat(3,minmax(0,1fr))]"
            : "grid-cols-[repeat(2,minmax(0,1fr))]",
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="min-w-0 px-3 first:pl-0 last:pr-0">
          <dt className="truncate text-xs text-[color:var(--fg-muted)]">{s.label}</dt>
          <dd className="numeric mt-0.5 truncate text-base font-semibold">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
