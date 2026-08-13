import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { getDashboardStats, type RecentWear } from "@/modules/analytics/data";
import { formatMoney, type MoneyByCurrency, type NeglectedFragrance } from "@/modules/analytics";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";

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
      <PageHeader
        eyebrow={greeting}
        title="Today"
        actions={
          hasCollection ? (
            <Link
              href="/advisor"
              className="rounded-sm bg-[color:var(--fg)] px-4 py-2 text-xs font-medium tracking-wide text-[color:var(--bg)]"
            >
              What should I wear?
            </Link>
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
          <Link href="/wear/new" className="link-editorial">
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

          <div className="mt-16 grid gap-12 md:grid-cols-2 md:gap-16">
            <MostWorn rows={stats.topWorn90d} />
            <Neglected rows={stats.neglected} />
          </div>

          <section aria-labelledby="recent-heading" className="mt-16">
            <div className="mb-4 flex items-baseline justify-between border-b border-[color:var(--rule)] pb-3">
              <h2
                id="recent-heading"
                className="text-[10px] font-medium tracking-[0.22em] text-[color:var(--fg-faint)] uppercase"
              >
                Recent activity
              </h2>
              <Link
                href="/wear"
                className="text-xs text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
              >
                View all →
              </Link>
            </div>
            <RecentActivity rows={stats.recentWears} now={now} />
          </section>
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
      <h2
        id="most-worn-heading"
        className="mb-3 border-b border-[color:var(--rule)] pb-3 text-[10px] font-medium tracking-[0.22em] text-[color:var(--fg-faint)] uppercase"
      >
        Most worn · 90 days
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[color:var(--fg-muted)]">No wears in the last 90 days.</p>
      ) : (
        <ol className="flex flex-col">
          {rows.map((r, i) => (
            <li key={r.fragranceId}>
              <Link
                href={`/fragrances/${r.fragranceId}`}
                className="flex items-baseline gap-4 py-3 transition-colors hover:bg-[color:var(--bg-elev)]"
              >
                <span className="w-4 font-serif text-lg text-[color:var(--color-accent)] italic tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
                    {r.brand}
                  </p>
                  <p className="truncate text-sm">{r.name}</p>
                </div>
                <span className="text-sm text-[color:var(--fg-muted)] tabular-nums">{r.wears}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Neglected({ rows }: { rows: NeglectedFragrance[] }) {
  return (
    <section aria-labelledby="neglected-heading">
      <h2
        id="neglected-heading"
        className="mb-3 border-b border-[color:var(--rule)] pb-3 text-[10px] font-medium tracking-[0.22em] text-[color:var(--fg-faint)] uppercase"
      >
        Neglected
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[color:var(--fg-muted)]">
          Nothing neglected — everything in your wardrobe has been worn recently or is newly bought.
        </p>
      ) : (
        <ol className="flex flex-col">
          {rows.map((r) => (
            <li key={r.fragranceId}>
              <Link
                href={`/fragrances/${r.fragranceId}`}
                className="flex items-baseline gap-4 py-3 transition-colors hover:bg-[color:var(--bg-elev)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
                    {r.brand}
                  </p>
                  <p className="truncate text-sm">{r.name}</p>
                </div>
                <span className="shrink-0 text-xs text-[color:var(--fg-muted)] tabular-nums">
                  {r.daysSinceLastWear === null ? "never" : `${r.daysSinceLastWear}d ago`}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RecentActivity({ rows, now }: { rows: RecentWear[]; now: Date }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[color:var(--fg-muted)]">No wears logged yet.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-[color:var(--rule)]">
      {rows.map((r) => (
        <li key={r.id} className="flex items-baseline gap-4 py-3">
          <span className="w-14 shrink-0 text-xs text-[color:var(--fg-faint)] tabular-nums">
            {formatRelative(r.wornAt, now)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
              {r.brandName}
            </p>
            <p className="truncate text-sm">
              <Link href={`/fragrances/${r.fragranceId}`} className="link-editorial">
                {r.fragranceName}
              </Link>
            </p>
          </div>
          <span className="text-xs text-[color:var(--fg-muted)] tabular-nums">
            {r.sprays} sprays
          </span>
        </li>
      ))}
    </ul>
  );
}
