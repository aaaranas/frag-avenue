import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { getInsights } from "@/modules/analytics/insights-data";
import { formatMoney } from "@/modules/analytics";
import type {
  AccordPreference,
  BrandFrequency,
  CpwRow,
  SeasonalCount,
  WeatherRatingRow,
} from "@/modules/analytics";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

const MIN_WEARS_FOR_INSIGHTS = 5;
const MIN_WEARS_FOR_CONCENTRATION = 10;

export default async function InsightsPage() {
  const user = await requireUser("/insights");
  const insights = await getInsights(user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Intelligence"
        title="Insights"
        subtitle="Everything here is counted from your own wear log."
      />

      {insights.totalWears < MIN_WEARS_FOR_INSIGHTS ? (
        <ColdStart totalWears={insights.totalWears} />
      ) : (
        <div className="flex flex-col">
          <Section title="Preferred accords" hint="Share of wears, weighted by enjoyment.">
            {insights.preferredAccords.length > 0 ? (
              <AccordList rows={insights.preferredAccords} />
            ) : (
              <MutedLine>Not enough accord data on your worn fragrances yet.</MutedLine>
            )}
          </Section>

          <Section title="Houses" hint="Bottles owned vs wears logged.">
            {insights.houseFrequencies.length > 0 ? (
              <HouseTable rows={insights.houseFrequencies} />
            ) : (
              <MutedLine>No houses to rank yet.</MutedLine>
            )}
          </Section>

          <Section title="Seasonal pattern" hint="Wears grouped by season.">
            <SeasonList rows={insights.seasonalPatterns} />
          </Section>

          <Section
            title="Weather &amp; enjoyment"
            hint="Averages need three rated wears to appear."
          >
            {insights.weatherRating.length > 0 ? (
              <WeatherTable rows={insights.weatherRating} />
            ) : (
              <MutedLine>No wears yet include weather data.</MutedLine>
            )}
          </Section>

          <Section
            title="Collection concentration"
            hint="Share of wears from your top 5 fragrances."
          >
            {insights.totalWears >= MIN_WEARS_FOR_CONCENTRATION ? (
              <ConcentrationStat
                ratio={insights.concentration.ratio}
                topWears={insights.concentration.topWears}
                totalWears={insights.concentration.totalWears}
              />
            ) : (
              <MutedLine>Log at least {MIN_WEARS_FOR_CONCENTRATION} wears to see this.</MutedLine>
            )}
          </Section>

          <Section
            title="Cost per wear"
            hint="Best value first. Needs a price and at least one wear."
          >
            {insights.costPerWear.length > 0 ? (
              <CpwList rows={insights.costPerWear} />
            ) : (
              <MutedLine>
                Add purchase prices to your collection items to see cost per wear.
              </MutedLine>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function ColdStart({ totalWears }: { totalWears: number }) {
  return (
    <EmptyState title="Not enough data yet.">
      {totalWears === 0
        ? "No wears yet."
        : `Only ${totalWears} wear${totalWears === 1 ? "" : "s"} so far.`}{" "}
      Insights unlock at {MIN_WEARS_FOR_INSIGHTS} wears. Frag Avenue won&apos;t invent patterns from
      too little data.{" "}
      <Link href="/wear/new" className="link-editorial">
        Log a wear
      </Link>
      .
    </EmptyState>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[color:var(--rule)] py-8 first:border-t-0 first:pt-0 md:py-10">
      <div className="mb-5 grid gap-1 md:grid-cols-[14rem_1fr] md:gap-8">
        <div>
          <h2 className="font-serif text-xl leading-tight">{title}</h2>
          {hint ? <p className="mt-1 text-xs text-[color:var(--fg-muted)]">{hint}</p> : null}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function MutedLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[color:var(--fg-muted)]">{children}</p>;
}

function AccordList({ rows }: { rows: AccordPreference[] }) {
  const max = Math.max(...rows.map((r) => r.share));
  return (
    <ul className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
      {rows.map((r) => (
        <li key={r.accord} className="grid grid-cols-[1fr_auto] items-center gap-4 py-3">
          <div>
            <p className="text-sm capitalize">{r.accord}</p>
            <div
              className="mt-1.5 h-[2px] w-full max-w-sm overflow-hidden bg-[color:var(--rule)]"
              aria-hidden
            >
              <div
                className="h-full bg-[color:var(--color-accent)]"
                style={{ width: `${(r.share / max) * 100}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-[color:var(--fg-muted)] tabular-nums">
            {(r.share * 100).toFixed(0)}%
          </p>
        </li>
      ))}
    </ul>
  );
}

function HouseTable({ rows }: { rows: BrandFrequency[] }) {
  return (
    <div className="border-y border-[color:var(--rule)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
            <th scope="col" className="border-b border-[color:var(--rule)] py-2 text-left">
              Brand
            </th>
            <th scope="col" className="border-b border-[color:var(--rule)] py-2 text-right">
              Bottles
            </th>
            <th scope="col" className="border-b border-[color:var(--rule)] py-2 text-right">
              Wears
            </th>
            <th scope="col" className="border-b border-[color:var(--rule)] py-2 text-right">
              W/bottle
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--rule)]">
          {rows.map((r) => (
            <tr key={r.brand}>
              <td className="py-3">{r.brand}</td>
              <td className="py-3 text-right tabular-nums">{r.bottles}</td>
              <td className="py-3 text-right tabular-nums">{r.wears}</td>
              <td className="py-3 text-right text-[color:var(--fg-muted)] tabular-nums">
                {r.bottles > 0 ? r.wearsPerBottle.toFixed(1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeasonList({ rows }: { rows: SeasonalCount[] }) {
  const max = Math.max(1, ...rows.map((r) => r.wears));
  return (
    <ul className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
      {rows.map((r) => (
        <li key={r.season} className="grid grid-cols-[6rem_1fr_auto] items-center gap-4 py-3">
          <p className="text-sm capitalize">{r.season}</p>
          <div className="h-[2px] w-full overflow-hidden bg-[color:var(--rule)]" aria-hidden>
            <div
              className="h-full bg-[color:var(--color-accent)]"
              style={{ width: `${(r.wears / max) * 100}%` }}
            />
          </div>
          <p className="text-xs text-[color:var(--fg-muted)] tabular-nums">
            {r.wears} · {(r.share * 100).toFixed(0)}%
          </p>
        </li>
      ))}
    </ul>
  );
}

function WeatherTable({ rows }: { rows: WeatherRatingRow[] }) {
  return (
    <div className="border-y border-[color:var(--rule)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
            <th scope="col" className="border-b border-[color:var(--rule)] py-2 text-left">
              Weather
            </th>
            <th scope="col" className="border-b border-[color:var(--rule)] py-2 text-right">
              Wears
            </th>
            <th scope="col" className="border-b border-[color:var(--rule)] py-2 text-right">
              Rated
            </th>
            <th scope="col" className="border-b border-[color:var(--rule)] py-2 text-right">
              Avg
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--rule)]">
          {rows.map((r) => (
            <tr key={r.bucket}>
              <td className="py-3 capitalize">{r.bucket}</td>
              <td className="py-3 text-right tabular-nums">{r.wears}</td>
              <td className="py-3 text-right text-[color:var(--fg-muted)] tabular-nums">
                {r.ratedWears}
              </td>
              <td className="py-3 text-right tabular-nums">
                {r.avgEnjoyment !== null ? `${r.avgEnjoyment.toFixed(1)} / 5` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConcentrationStat({
  ratio,
  topWears,
  totalWears,
}: {
  ratio: number;
  topWears: number;
  totalWears: number;
}) {
  const pct = Math.round(ratio * 100);
  const hint =
    ratio >= 0.7
      ? "Concentrated — a small rotation carries most of your wearing."
      : ratio >= 0.4
        ? "Balanced — a clear rotation with real variety around it."
        : "Diffuse — your collection is well-distributed across many bottles.";
  return (
    <div className="border-y border-[color:var(--rule)] py-5">
      <p className="numeric text-5xl leading-none font-medium">
        {pct}
        <span className="text-2xl text-[color:var(--fg-faint)]">%</span>
      </p>
      <p className="mt-2 text-xs text-[color:var(--fg-muted)]">
        Top 5 fragrances account for {topWears} of {totalWears} wears.
      </p>
      <p className="mt-1 text-xs text-[color:var(--fg-faint)]">{hint}</p>
    </div>
  );
}

function CpwList({ rows }: { rows: CpwRow[] }) {
  return (
    <ul className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
      {rows.map((r) => (
        <li key={r.fragranceId} className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
              {r.brand}
            </p>
            <p className="truncate text-sm">{r.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm tabular-nums">
              {formatMoney({ amountMinor: r.cpwMinor, currency: r.currency })}
              <span className="ml-1 text-xs text-[color:var(--fg-faint)]">/ wear</span>
            </p>
            <p className="text-[10px] text-[color:var(--fg-faint)] tabular-nums">
              {r.wearCount} {r.wearCount === 1 ? "wear" : "wears"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
