import Link from "next/link";
import { Suspense } from "react";
import {
  FragranceListInput,
  listFragrances,
  totalPages,
  type FragranceListResult,
} from "@/modules/fragrances";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
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
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Catalogue" title="Fragrances" />

      <div className="mb-6 max-w-md">
        <SearchInput initialQ={input.q ?? ""} />
      </div>

      <Suspense key={`${input.q ?? ""}-${input.page}`} fallback={<ListSkeleton />}>
        <ResultList input={input} />
      </Suspense>
    </div>
  );
}

async function ResultList({ input }: { input: FragranceListInput }) {
  const result = await listFragrances(input);
  if (result.items.length === 0) return <EmptyStateWithQ q={input.q} />;
  return (
    <>
      <List result={result} />
      <Pager result={result} q={input.q} />
    </>
  );
}

function List({ result }: { result: FragranceListResult }) {
  return (
    <ul className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
      {result.items.map((f) => (
        <li key={f.id}>
          <Link
            href={`/fragrances/${f.id}`}
            className="flex items-baseline justify-between gap-4 px-2 py-4 transition-colors hover:bg-[color:var(--bg-elev)]"
          >
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
                {f.brand.name}
              </p>
              <p className="mt-1 font-serif text-lg leading-snug italic">{f.name}</p>
            </div>
            <div className="shrink-0 text-[11px] tracking-wide text-[color:var(--fg-muted)]">
              {f.concentration}
              {f.releaseYear ? ` · ${f.releaseYear}` : ""}
            </div>
          </Link>
        </li>
      ))}
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
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-xs">
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

function ListSkeleton() {
  return (
    <ul className="flex animate-pulse flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="px-2 py-4">
          <div className="h-3 w-24 rounded bg-[color:var(--rule)]" />
          <div className="mt-2 h-4 w-56 rounded bg-[color:var(--rule)]" />
        </li>
      ))}
    </ul>
  );
}
