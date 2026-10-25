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
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { Section } from "@/components/ui/section";
import { BarChart3 } from "lucide-react";

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
      <PageHeader title="Your stats" />

      <SegmentedNav
        label="Range"
        className="mb-5"
        segments={STAT_RANGES.map((r) => ({
          href: r === "all" ? "/stats" : `/stats?range=${r}`,
          label: RANGE_LABEL[r],
          current: r === range,
        }))}
      />

      {/* The range control above says which period; tiles don't repeat it. */}
      <section
        aria-label="Totals"
        className="mb-10 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2 sm:gap-3"
      >
        <Stat label="Wears" value={stats.totalWears} />
        <Stat label="Unique scents" value={stats.uniqueScents} />
        <Stat
          label="Day streak"
          value={
            <>
              {stats.streakDays}
              <span className="text-base font-medium text-[color:var(--fg-muted)]">
                {stats.streakDays === 1 ? " day" : " days"}
              </span>
            </>
          }
        />
      </section>

      {stats.totalWears === 0 ? (
        <EmptyState
          title={range === "all" ? "No wears yet" : `No wears in ${period}`}
          icon={<BarChart3 />}
          action={
            <Button asChild>
              <Link href="/log">Log a wear</Link>
            </Button>
          }
        >
          Stats build up as you log.
        </EmptyState>
      ) : (
        <>
          <Section id="most-worn" title="Most worn" description={`By number of wears, ${period}.`}>
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
            description={`Share of your wears, ${period}. Each wear counts once, split across its fragrance's accords by strength.`}
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
        description="Owned bottles, decants, and samples you haven't worn in a month or more."
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
        description="How long each scent lasts at different temperatures."
      >
        <div className="rounded-xl border border-dashed border-[color:var(--rule-strong)] p-4 text-sm">
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
