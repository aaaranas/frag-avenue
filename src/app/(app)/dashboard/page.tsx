import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { CheckInPrompts } from "@/components/wear/check-in-prompts";
import { getDashboardStats, type RecentWear } from "@/modules/analytics/data";
import { formatMoney, type MoneyByCurrency, type NeglectedFragrance } from "@/modules/analytics";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function formatVolume(ml: number): string {
  if (ml >= 1000) {
    const l = ml / 1000;
    return `${l.toFixed(l < 10 ? 2 : 1)}L`;
  }
  return `${ml}ml`;
}

function formatMoneyList(values: MoneyByCurrency): React.ReactNode {
  if (values.length === 0) return "—";
  return values.map((m, i) => (
    <span key={m.currency}>
      {i > 0 ? <span className="mx-2 text-[color:var(--fg-faint)]">·</span> : null}
      {formatMoney({ amountMinor: m.amountMinor, currency: m.currency })}
    </span>
  ));
}

function formatRelative(d: Date, now: Date): string {
  const diffMs = now.getTime() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
  }
  const days = Math.floor(diffMs / day);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const now = new Date();
  const stats = await getDashboardStats(user.id, now);

  const hasCollection = stats.fragrancesOwned > 0;
  const hasWears = stats.totalWears > 0;
  const firstName = user.name?.split(" ")[0];
  const greeting = firstName ? `${greetingFor(now)}, ${firstName}` : greetingFor(now);

  return (
    <div className="mx-auto max-w-5xl">
      <CheckInPrompts userId={user.id} />
      <PageHeader
        eyebrow={greeting}
        title="Today"
        actions={
          hasCollection ? (
            <>
              <Button asChild variant="outline">
                <Link href="/log">
                  <Plus /> Log a wear
                </Link>
              </Button>
              <Button asChild>
                <Link href="/advisor">What should I wear?</Link>
              </Button>
            </>
          ) : null
        }
      />

      {!hasCollection && !hasWears ? (
        <EmptyState title="A blank wardrobe.">
          Start by{" "}
          <Link href="/fragrances" className="link-editorial">
            adding a fragrance
          </Link>{" "}
          or{" "}
          <Link href="/log" className="link-editorial">
            logging a wear
          </Link>
          .
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">
              Summary
            </h2>
            <dl className="grid grid-cols-2 gap-x-8 md:grid-cols-5">
              <Stat label="Fragrances" value={stats.fragrancesOwned} />
              <Stat
                label="Bottles"
                value={stats.totalVolumeMl > 0 ? formatVolume(stats.totalVolumeMl) : "—"}
              />
              <Stat
                label="Value"
                value={formatMoneyList(stats.collectionValue)}
                hint={stats.collectionValue.length === 0 ? "No prices recorded" : undefined}
              />
              <Stat label="Wears" value={stats.totalWears} />
              <Stat label="Sprays" value={stats.totalSprays} />
            </dl>
          </section>

          {/*
            Recent activity is the tallest block, so it anchors the left column
            and the two short summaries stack beside it. Laid out side by side
            as three equal sections, the page ended half empty.
          */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
            {/* Each panel stays a labelled region: the Card is presentational,
                so the landmark and its accessible name live on the section. */}
            <section aria-labelledby="recent-heading">
              <Card>
                <CardHeader className="border-b border-[color:var(--rule)] pb-4">
                  <CardTitle id="recent-heading" className="font-serif text-lg font-normal">
                    Recent activity
                  </CardTitle>
                  <div className="col-start-2 row-span-2 row-start-1 self-center justify-self-end">
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/wears">
                        All wears <ArrowRight />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <RecentActivity rows={stats.recentWears} now={now} />
                </CardContent>
              </Card>
            </section>

            <div className="flex flex-col gap-6">
              <MostWorn rows={stats.topWorn90d} />
              <Neglected rows={stats.neglected} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function MostWorn({
  rows,
}: {
  rows: Array<{ fragranceId: string; name: string; brand: string; wears: number }>;
}) {
  return (
    <section aria-labelledby="most-worn-heading">
      <Card>
        <CardHeader className="border-b border-[color:var(--rule)] pb-4">
          <CardTitle id="most-worn-heading" className="font-serif text-lg font-normal">
            Most worn
          </CardTitle>
          <p className="label-caps">Last 90 days</p>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-2 text-sm text-[color:var(--fg-muted)]">
              No wears in the last 90 days.
            </p>
          ) : (
            <ol className="-mx-2 flex flex-col">
              {rows.map((r, i) => (
                <li key={r.fragranceId}>
                  <Link
                    href={`/fragrances/${r.fragranceId}`}
                    className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-[color:var(--brand-wash)]"
                  >
                    <span className="numeric flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-wash)] text-xs font-medium text-[color:var(--brand)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="label-caps truncate">{r.brand}</p>
                      <p className="truncate text-sm">{r.name}</p>
                    </div>
                    <span className="numeric shrink-0 text-sm text-[color:var(--fg-muted)]">
                      {r.wears}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Neglected({ rows }: { rows: NeglectedFragrance[] }) {
  return (
    <section aria-labelledby="neglected-heading">
      <Card>
        <CardHeader className="border-b border-[color:var(--rule)] pb-4">
          <CardTitle id="neglected-heading" className="font-serif text-lg font-normal">
            Neglected
          </CardTitle>
          <p className="label-caps">Owned 90d+, unworn 60d+</p>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-2 text-sm text-[color:var(--fg-muted)]">
              Nothing neglected. Everything has been worn recently or is newly bought.
            </p>
          ) : (
            <ol className="-mx-2 flex flex-col">
              {rows.map((r) => (
                <li key={r.fragranceId}>
                  <Link
                    href={`/fragrances/${r.fragranceId}`}
                    className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-[color:var(--accent-wash)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="label-caps truncate">{r.brand}</p>
                      <p className="truncate text-sm">{r.name}</p>
                    </div>
                    <span className="numeric shrink-0 text-xs text-[color:var(--accent-amber)]">
                      {r.daysSinceLastWear === null ? "never worn" : `${r.daysSinceLastWear}d ago`}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function RecentActivity({ rows, now }: { rows: RecentWear[]; now: Date }) {
  if (rows.length === 0) {
    return <p className="py-2 text-sm text-[color:var(--fg-muted)]">No wears logged yet.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-[color:var(--rule)]">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-4 py-3 first:pt-1">
          <span className="numeric w-14 shrink-0 text-xs text-[color:var(--fg-faint)]">
            {formatRelative(r.wornAt, now)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="label-caps truncate">{r.brandName}</p>
            <p className="truncate text-sm">
              <Link href={`/fragrances/${r.fragranceId}`} className="link-editorial">
                {r.fragranceName}
              </Link>
            </p>
          </div>
          <span className="numeric shrink-0 text-xs text-[color:var(--fg-muted)]">
            {r.sprays} sprays
          </span>
        </li>
      ))}
    </ul>
  );
}
