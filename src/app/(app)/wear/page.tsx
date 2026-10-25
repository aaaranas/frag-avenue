import Link from "next/link";
import { z } from "zod";
import { requireUser } from "@/modules/auth/session";
import { listWearsForUser, type WearListRow } from "@/modules/wear-logs/data";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<{ page?: string }>;

const PAGE_SIZE = 20;

const PageInput = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export const metadata = { title: "Wear journal" };

// Dates are shown in the zone each wear was logged in.
function formatDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatTime(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function occasionLabel(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

export default async function WearJournalPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/wear");
  const params = await searchParams;
  const { page } = PageInput.parse({ page: params.page });

  const [total, rows] = await listWearsForUser(user.id, { page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Journal"
        title="Wear history"
        actions={
          <Button asChild>
            <Link href="/wear/new">Log a wear</Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="No wears logged yet.">
          <Link href="/wear/new" className="link-editorial">
            Log your first wear
          </Link>
          .
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
            {rows.map((w) => (
              <WearRow key={w.id} wear={w} />
            ))}
          </ul>
          <Pager page={page} pages={pages} total={total} />
        </>
      )}
    </div>
  );
}

function WearRow({ wear }: { wear: WearListRow }) {
  return (
    <li className="grid grid-cols-[5rem_1fr_auto] items-start gap-4 py-5">
      <div className="text-xs text-[color:var(--fg-muted)] tabular-nums">
        <p>{formatDate(wear.wornAt, wear.timeZone)}</p>
        <p className="text-[color:var(--fg-faint)]">{formatTime(wear.wornAt, wear.timeZone)}</p>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
          {wear.fragrance.brand.name}
        </p>
        <p className="mt-1 font-serif text-lg leading-snug">{wear.fragrance.name}</p>
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--fg-muted)]">
          <span className="tabular-nums">{wear.sprays} sprays</span>
          <span>{occasionLabel(wear.occasion)}</span>
          {wear.temperatureC !== null ? (
            <span className="tabular-nums">{wear.temperatureC}°C</span>
          ) : null}
          {wear.weatherCondition ? <span>{wear.weatherCondition}</span> : null}
          {wear.enjoyment !== null ? (
            <span className="text-[color:var(--fg)] tabular-nums">{wear.enjoyment}/5</span>
          ) : null}
        </p>
      </div>

      <Link
        href={`/wear/${wear.id}/edit`}
        className="inline-flex min-h-11 shrink-0 items-center rounded-sm border border-[color:var(--rule-strong)] px-3 text-xs hover:bg-[color:var(--bg-elev)]"
      >
        Edit
      </Link>
    </li>
  );
}

function Pager({ page, pages, total }: { page: number; pages: number; total: number }) {
  const prev = page > 1 ? page - 1 : null;
  const next = page < pages ? page + 1 : null;
  const href = (p: number) => (p > 1 ? `/wear?page=${p}` : `/wear`);
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-xs">
      <p className="text-[color:var(--fg-muted)]">
        Page {page} of {pages} · {total} total
      </p>
      <div className="flex gap-2">
        {[
          { href: prev ? href(prev) : null, label: "Previous" },
          { href: next ? href(next) : null, label: "Next" },
        ].map((b) => (
          <PageBtn key={b.label} href={b.href} label={b.label} />
        ))}
      </div>
    </nav>
  );
}

function PageBtn({ href, label }: { href: string | null; label: string }) {
  const base =
    "inline-flex min-h-11 items-center rounded-sm border border-[color:var(--rule-strong)] px-3 tracking-wide";
  if (!href) return <span className={`${base} text-[color:var(--fg-faint)]`}>{label}</span>;
  return (
    <Link href={href} className={`${base} hover:bg-[color:var(--bg-elev)]`}>
      {label}
    </Link>
  );
}
