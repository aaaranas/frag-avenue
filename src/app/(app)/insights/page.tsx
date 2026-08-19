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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

const MIN_WEARS_FOR_INSIGHTS = 5;
const MIN_WEARS_FOR_CONCENTRATION = 10;

export default async function InsightsPage() {
  const user = await requireUser("/insights");
  const insights = await getInsights(user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Intelligence"
        title="Insights"
        subtitle="Everything here is counted from your own wear log."
      />

      {insights.totalWears < MIN_WEARS_FOR_INSIGHTS ? (
        <ColdStart totalWears={insights.totalWears} />
      ) : (
        /*
          A two-column masonry-ish grid rather than one long stack of
          full-width rows: the sections carry very different amounts of
          content, and stacked full-width they left the page half empty.
        */
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Panel title="Preferred accords" hint="Share of wears, weighted by enjoyment.">
            {insights.preferredAccords.length > 0 ? (
              <AccordList rows={insights.preferredAccords} />
            ) : (
              <MutedLine>Not enough accord data on your worn fragrances yet.</MutedLine>
            )}
          </Panel>

          <Panel title="Seasonal pattern" hint="Wears grouped by season.">
            <SeasonList rows={insights.seasonalPatterns} />
          </Panel>

          <Panel title="Houses" hint="Bottles owned against wears logged.">
            {insights.houseFrequencies.length > 0 ? (
              <HouseTable rows={insights.houseFrequencies} />
            ) : (
              <MutedLine>No houses to rank yet.</MutedLine>
            )}
          </Panel>

          <Panel title="Weather and enjoyment" hint="Averages need three rated wears to appear.">
            {insights.weatherRating.length > 0 ? (
              <WeatherTable rows={insights.weatherRating} />
            ) : (
              <MutedLine>No wears yet include weather data.</MutedLine>
            )}
          </Panel>

          <Panel
            title="Collection concentration"
            hint="Share of wears from your top five fragrances."
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
          </Panel>

          <Panel
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
          </Panel>
        </div>
      )}
    </div>
  );
}

function ColdStart({ totalWears }: { totalWears: number }) {
  return (
    <EmptyState title="Not enough data yet.">
      {totalWears === 0
        ? "No wears logged."
        : `Only ${totalWears} wear${totalWears === 1 ? "" : "s"} so far.`}{" "}
      Insights open up at {MIN_WEARS_FOR_INSIGHTS}, because below that any pattern would be noise.{" "}
      <Link href="/wear/new" className="link-editorial">
        Log a wear
      </Link>
      .
    </EmptyState>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0">
      <CardHeader className="border-b border-[color:var(--rule)] pb-4">
        <CardTitle className="font-serif text-lg font-normal">{title}</CardTitle>
        {hint ? <p className="mt-1 text-xs text-[color:var(--fg-faint)]">{hint}</p> : null}
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

function MutedLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[color:var(--fg-muted)]">{children}</p>;
}

/** Shared bar. Green because it is structure, not emphasis. */
function Bar({ ratio }: { ratio: number }) {
  return (
    <div
      aria-hidden
      className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--bg-sunken)]"
    >
      <div
        className="h-full rounded-full bg-[color:var(--brand)]"
        style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
      />
    </div>
  );
}

function AccordList({ rows }: { rows: AccordPreference[] }) {
  const max = Math.max(...rows.map((r) => r.share));
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => (
        <li key={r.accord}>
          <div className="mb-1.5 flex items-baseline justify-between gap-4">
            <span className="text-sm capitalize">{r.accord}</span>
            <span className="numeric text-xs text-[color:var(--fg-muted)]">
              {(r.share * 100).toFixed(0)}%
            </span>
          </div>
          <Bar ratio={r.share / max} />
        </li>
      ))}
    </ul>
  );
}

function SeasonList({ rows }: { rows: SeasonalCount[] }) {
  const max = Math.max(1, ...rows.map((r) => r.wears));
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => (
        <li key={r.season}>
          <div className="mb-1.5 flex items-baseline justify-between gap-4">
            <span className="text-sm capitalize">{r.season}</span>
            <span className="numeric text-xs text-[color:var(--fg-muted)]">
              {r.wears} wears · {(r.share * 100).toFixed(0)}%
            </span>
          </div>
          <Bar ratio={r.wears / max} />
        </li>
      ))}
    </ul>
  );
}

function HouseTable({ rows }: { rows: BrandFrequency[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>House</TableHead>
          <TableHead className="text-right">Bottles</TableHead>
          <TableHead className="text-right">Wears</TableHead>
          <TableHead className="text-right">Per bottle</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.brand}>
            <TableCell className="font-medium">{r.brand}</TableCell>
            <TableCell className="numeric text-right">{r.bottles}</TableCell>
            <TableCell className="numeric text-right">{r.wears}</TableCell>
            <TableCell className="numeric text-right text-[color:var(--fg-muted)]">
              {r.bottles > 0 ? r.wearsPerBottle.toFixed(1) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function WeatherTable({ rows }: { rows: WeatherRatingRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Weather</TableHead>
          <TableHead className="text-right">Wears</TableHead>
          <TableHead className="text-right">Rated</TableHead>
          <TableHead className="text-right">Average</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.bucket}>
            <TableCell className="font-medium capitalize">{r.bucket}</TableCell>
            <TableCell className="numeric text-right">{r.wears}</TableCell>
            <TableCell className="numeric text-right text-[color:var(--fg-muted)]">
              {r.ratedWears}
            </TableCell>
            <TableCell className="numeric text-right">
              {r.avgEnjoyment !== null ? `${r.avgEnjoyment.toFixed(1)} / 5` : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
      ? "A small rotation carries most of your wearing."
      : ratio >= 0.4
        ? "A clear rotation, with real variety around it."
        : "Spread widely across the collection.";
  return (
    <div>
      <p className="numeric text-5xl leading-none font-medium text-[color:var(--brand)]">
        {pct}
        <span className="text-2xl text-[color:var(--fg-faint)]">%</span>
      </p>
      <div className="mt-4">
        <Bar ratio={ratio} />
      </div>
      <p className="mt-3 text-sm text-[color:var(--fg-muted)]">
        Your top five account for {topWears} of {totalWears} wears.
      </p>
      <p className="mt-1 text-sm text-[color:var(--fg-faint)]">{hint}</p>
    </div>
  );
}

function CpwList({ rows }: { rows: CpwRow[] }) {
  return (
    <ul className="flex flex-col divide-y divide-[color:var(--rule)]">
      {rows.map((r, i) => (
        <li
          key={r.fragranceId}
          className={`grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 ${i === 0 ? "pt-0" : ""}`}
        >
          <div className="min-w-0">
            <p className="label-caps truncate">{r.brand}</p>
            <p className="truncate text-sm">{r.name}</p>
          </div>
          <div className="text-right">
            <p className="numeric text-sm">
              {formatMoney({ amountMinor: r.cpwMinor, currency: r.currency })}
              <span className="ml-1 text-xs text-[color:var(--fg-faint)]">/ wear</span>
            </p>
            <p className="numeric text-[11px] text-[color:var(--fg-faint)]">
              {r.wearCount} {r.wearCount === 1 ? "wear" : "wears"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
