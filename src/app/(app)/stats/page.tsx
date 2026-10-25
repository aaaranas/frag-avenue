import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { getStatsForUser } from "@/modules/analytics/stats-data";
import { STAT_RANGES, WEATHER_CHART_MIN_POINTS, type StatRange } from "@/modules/analytics";
import { KIND_LABEL } from "@/modules/wardrobe";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { BarList } from "@/components/stats/bar-list";
import { cn } from "@/lib/utils";

export const metadata = { title: "Stats" };

type SearchParams = Promise<{ range?: string | string[] }>;

const RANGE_LABEL: Record<StatRange, string> = {
  "30d": "30 days",
  "90d": "90 days",
  all: "All time",
};

export default async function StatsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/stats");
  const raw = (await searchParams).range;
  const range: StatRange = (STAT_RANGES as readonly string[]).includes(String(raw))
    ? (raw as StatRange)
    : "all";
  const { stats, fragrances } = await getStatsForUser(user.id, range, new Date());
  const name = (id: string) => {
    const f = fragrances.get(id);
    return f ? `${f.brand} ${f.name}` : "Unknown fragrance";
  };
  const period = range === "all" ? "all time" : `the last ${RANGE_LABEL[range]}`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Stats" title="Your stats" />

      <nav aria-label="Range" className="mb-6">
        <ul className="flex flex-wrap gap-2">
          {STAT_RANGES.map((r) => (
            <li key={r}>
              <Link
                href={r === "all" ? "/stats" : `/stats?range=${r}`}
                aria-current={r === range ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm",
                  r === range
                    ? "border-[color:var(--accent-color)] bg-[color:var(--accent-color)] font-medium text-[color:var(--accent-fg)]"
                    : "border-[color:var(--rule-strong)] hover:bg-[color:var(--bg-sunken)]",
                )}
              >
                {RANGE_LABEL[r]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section
        aria-label="Totals"
        className="mb-10 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-6 sm:grid-cols-3"
      >
        <Stat label="Wears" value={stats.totalWears} hint={capitalise(period)} />
        <Stat label="Unique scents" value={stats.uniqueScents} hint={capitalise(period)} />
        <Stat
          label="Day streak"
          value={`${stats.streakDays} ${stats.streakDays === 1 ? "day" : "days"}`}
          hint="Consecutive days, through today or yesterday"
        />
      </section>

      {stats.totalWears === 0 ? (
        <EmptyState title={range === "all" ? "No wears yet" : `No wears in ${period}`}>
          Stats build up as you log.
          <div className="mt-4">
            <Button asChild>
              <Link href="/log">Log a wear</Link>
            </Button>
          </div>
        </EmptyState>
      ) : (
        <>
          <Section id="most-worn" title="Most worn" caption={`By number of wears, ${period}.`}>
            <BarList
              label="Most worn"
              rows={stats.mostWorn.map((m) => ({
                key: m.fragranceId,
                name: name(m.fragranceId),
                value: m.wears,
                valueText: `${m.wears} ${m.wears === 1 ? "wear" : "wears"}`,
              }))}
            />
          </Section>

          <Section
            id="accords"
            title="Accord breakdown"
            caption={`Share of your wears, ${period}. Each wear counts once, split across its fragrance's accords by strength.`}
          >
            {stats.accords.length === 0 ? (
              <p className="text-sm text-[color:var(--fg-muted)]">
                None of these fragrances has accords in the catalogue yet.
              </p>
            ) : (
              <BarList
                label="Accord breakdown"
                rows={stats.accords.slice(0, 8).map((a) => ({
                  key: a.accord,
                  name: <span className="capitalize">{a.accord}</span>,
                  value: a.share,
                  valueText: `${Math.round(a.share * 100)}%`,
                }))}
              />
            )}
          </Section>
        </>
      )}

      <Section
        id="untouched"
        title="Untouched for 30+ days"
        caption="Owned bottles, decants, and samples you haven't worn in a month or more."
      >
        {stats.untouched.length === 0 ? (
          <p className="text-sm text-[color:var(--fg-muted)]">
            Everything you own was worn in the last 30 days.
          </p>
        ) : (
          <ul
            className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]"
            aria-label="Untouched"
          >
            {stats.untouched.map((u) => (
              <li key={u.itemId} className="flex items-center justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{name(u.fragranceId)}</p>
                  <p className="text-xs text-[color:var(--fg-muted)]">
                    {KIND_LABEL[u.kind]} ·{" "}
                    {u.daysSince === null ? "Never worn" : `${u.daysSince} days since last wear`}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/log?item=${u.itemId}`}
                    aria-label={`Log a wear of ${name(u.fragranceId)}`}
                  >
                    Wear
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        id="weather"
        title="Performance vs weather"
        caption="How long each scent lasts at different temperatures."
      >
        <div className="rounded-lg border border-dashed border-[color:var(--rule-strong)] p-4 text-sm">
          <p>
            Coming soon. It needs wears with both weather attached and a check-in answered:{" "}
            <span className="numeric font-medium">
              {Math.min(stats.weatherPerformancePoints, WEATHER_CHART_MIN_POINTS)} of{" "}
              {WEATHER_CHART_MIN_POINTS}
            </span>{" "}
            so far.
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  caption,
  children,
}: {
  id: string;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="mb-10">
      <h2 id={`${id}-heading`} className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-1 mb-4 text-sm text-[color:var(--fg-muted)]">{caption}</p>
      {children}
    </section>
  );
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
