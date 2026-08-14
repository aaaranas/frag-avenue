import Link from "next/link";
import { Suspense } from "react";
import {
  FragranceListInput,
  listFragrances,
  totalPages,
  type FragranceListResult,
} from "@/modules/fragrances";
import { Bottle } from "@/components/bottle/bottle";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { primaryAccordColor } from "@/lib/accord-colors";
import { SearchInput } from "./search-input";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = {
  title: "Fragrances",
};

export default async function FragrancesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const input = FragranceListInput.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    page: typeof params.page === "string" ? params.page : undefined,
    pageSize: typeof params.pageSize === "string" ? params.pageSize : undefined,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Catalogue" title="Fragrances" />

      <div className="mb-8 max-w-md">
        <SearchInput initialQ={input.q ?? ""} />
      </div>

      <Suspense key={`${input.q ?? ""}-${input.page}`} fallback={<GridSkeleton />}>
        <ResultGrid input={input} />
      </Suspense>
    </div>
  );
}

async function ResultGrid({ input }: { input: FragranceListInput }) {
  const result = await listFragrances(input);
  if (result.items.length === 0) return <EmptyStateWithQ q={input.q} />;
  return (
    <>
      <Grid result={result} />
      <Pager result={result} q={input.q} />
    </>
  );
}

function Grid({ result }: { result: FragranceListResult }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-14 lg:grid-cols-4">
      {result.items.map((f) => {
        const color = primaryAccordColor(
          f.accords.map((a) => ({ name: a.accord.name, strength: a.strength })),
        );
        return (
          <li key={f.id}>
            <Link
              href={`/fragrances/${f.id}`}
              className="group flex flex-col items-center text-center transition-transform hover:-translate-y-1"
            >
              <div className="relative flex h-48 items-end justify-center">
                <Bottle
                  color={color}
                  concentration={f.concentration}
                  size={100}
                  className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.1)] group-hover:drop-shadow-[0_10px_18px_rgba(0,0,0,0.16)]"
                />
                <div
                  aria-hidden
                  className="absolute bottom-0 left-1/2 h-px w-24 -translate-x-1/2 bg-[color:var(--rule-strong)]"
                />
              </div>
              <p className="mt-5 text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
                {f.brand.name}
              </p>
              <p className="mt-1 font-serif text-base leading-snug italic">{f.name}</p>
              <p className="mt-1 text-[11px] text-[color:var(--fg-muted)]">
                {f.concentration}
                {f.releaseYear ? (
                  <>
                    <span className="mx-1.5 text-[color:var(--fg-faint)]">·</span>
                    <span className="tabular-nums">{f.releaseYear}</span>
                  </>
                ) : null}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Pager({ result, q }: { result: FragranceListResult; q?: string }) {
  const pages = totalPages(result.total, result.pageSize);
  const prevPage = result.page > 1 ? result.page - 1 : null;
  const nextPage = result.page < pages ? result.page + 1 : null;

  const href = (page: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (page > 1) sp.set("page", String(page));
    const s = sp.toString();
    return s ? `/fragrances?${s}` : `/fragrances`;
  };

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-between text-xs">
      <p className="text-[color:var(--fg-muted)]">
        Page {result.page} of {pages} · {result.total} total
      </p>
      <div className="flex gap-2">
        <PagerLink href={prevPage ? href(prevPage) : null} label="Previous" />
        <PagerLink href={nextPage ? href(nextPage) : null} label="Next" />
      </div>
    </nav>
  );
}

function PagerLink({ href, label }: { href: string | null; label: string }) {
  const base = "rounded-sm border border-[color:var(--rule-strong)] px-3 py-1.5 tracking-wide";
  if (!href) {
    return (
      <span aria-disabled className={`${base} text-[color:var(--fg-faint)]`}>
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className={`${base} hover:bg-[color:var(--bg-elev)]`}>
      {label}
    </Link>
  );
}

function EmptyStateWithQ({ q }: { q?: string }) {
  return (
    <EmptyState title={q ? "No matches." : "The catalogue is empty."}>
      {q ? (
        <>
          Nothing matches <span className="font-medium">&ldquo;{q}&rdquo;</span>.
        </>
      ) : (
        <>
          Run <code className="font-mono">pnpm db:seed</code> to load examples.
        </>
      )}
    </EmptyState>
  );
}

function GridSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-14 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="flex animate-pulse flex-col items-center">
          <div className="h-40 w-24 rounded bg-[color:var(--rule)]" />
          <div className="mt-5 h-3 w-24 rounded bg-[color:var(--rule)]" />
          <div className="mt-2 h-4 w-32 rounded bg-[color:var(--rule)]" />
        </li>
      ))}
    </ul>
  );
}
