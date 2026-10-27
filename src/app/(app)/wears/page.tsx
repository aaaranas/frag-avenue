import Link from "next/link";
import { z } from "zod";
import { requireUser } from "@/modules/auth/session";
import { findLogDefaults, listWearsForUser, type WearListRow } from "@/modules/wear-logs/data";
import { MOOD_LABEL, OCCASION_LABEL, checkInSummary } from "@/modules/wear-logs";
import { formatDateTime } from "@/lib/format";
import { formatTemperature, type UnitSystem } from "@/lib/units";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { CheckInPrompts } from "@/components/wear/check-in-prompts";
import { VisibilityBadge } from "@/components/social/visibility-badge";
import { Plus } from "lucide-react";

type SearchParams = Promise<{ page?: string }>;
const PAGE_SIZE = 20;
const PageInput = z.object({ page: z.coerce.number().int().min(1).catch(1).default(1) });

export const metadata = { title: "Your wears" };

export default async function WearsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/wears");
  const { page } = PageInput.parse({ page: (await searchParams).page });
  const [[total, rows], defaults] = await Promise.all([
    listWearsForUser(user.id, { page, pageSize: PAGE_SIZE }),
    findLogDefaults(user.id),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-2xl">
      <CheckInPrompts userId={user.id} />
      <PageHeader
        title="Your wears"
        actions={
          <Button asChild>
            <Link href="/log">Log a wear</Link>
          </Button>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No wears logged yet"
          icon={<Plus />}
          action={
            <Button asChild>
              <Link href="/log">Log your first wear</Link>
            </Button>
          }
        >
          Each wear you log shows up here, newest first.
        </EmptyState>
      ) : (
        <>
          <ul
            className="divide-y divide-[color:var(--rule)] overflow-hidden rounded-xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)]"
            aria-label="Wears"
          >
            {rows.map((w) => (
              <WearRow key={w.id} wear={w} units={defaults.units} />
            ))}
          </ul>
          <Pager page={page} pages={pages} total={total} />
        </>
      )}
    </div>
  );
}

function WearRow({ wear, units }: { wear: WearListRow; units: UnitSystem }) {
  const summary = checkInSummary(wear.checkIns);
  const details = [
    `${wear.sprays} ${wear.sprays === 1 ? "spray" : "sprays"}`,
    OCCASION_LABEL[wear.occasion as keyof typeof OCCASION_LABEL] ?? wear.occasion,
    wear.mood ? MOOD_LABEL[wear.mood] : null,
    wear.temperatureC !== null ? formatTemperature(wear.temperatureC, units) : null,
  ].filter(Boolean);
  return (
    <li>
      <Link
        href={`/wears/${wear.id}`}
        className="flex min-h-11 gap-4 p-3 transition-colors hover:bg-[color:var(--bg-sunken)]"
      >
        <FragranceThumb
          imagePath={wear.fragrance.imagePath}
          kind={wear.collectionItem?.kind ?? "BOTTLE"}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{wear.fragrance.name}</p>
          <p className="truncate text-sm text-[color:var(--fg-muted)]">
            {wear.fragrance.brand.name}
          </p>
          <p className="mt-1 text-sm">{details.join(", ")}</p>
          {summary ? <p className="text-sm">{summary}</p> : null}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--fg-muted)]">
            {formatDateTime(wear.wornAt, wear.timeZone)}
            <VisibilityBadge visibility={wear.visibility} />
          </p>
        </div>
      </Link>
    </li>
  );
}

function Pager({ page, pages, total }: { page: number; pages: number; total: number }) {
  const href = (p: number) => (p > 1 ? `/wears?page=${p}` : "/wears");
  const base =
    "inline-flex min-h-11 items-center rounded-md border border-[color:var(--rule-strong)] px-3 text-sm";
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4">
      <p className="text-sm text-[color:var(--fg-muted)]">
        {total} wears, page {page} of {pages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={base}>
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className={base}>
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
