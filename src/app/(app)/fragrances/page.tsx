import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/modules/auth/session";
import { FragranceListInput, totalPages, type FragranceListResult } from "@/modules/fragrances";
import { listFragrances } from "@/modules/fragrances/data";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { SearchInput } from "./search-input";
import { Badge } from "@/components/ui/badge";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = {
  title: "Catalogue",
};

export default async function FragrancesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/fragrances");
  const params = await searchParams;
  const input = FragranceListInput.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    page: typeof params.page === "string" ? params.page : undefined,
    pageSize: typeof params.pageSize === "string" ? params.pageSize : undefined,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Wardrobe"
        title="Catalogue"
        subtitle="Find a fragrance to add to your wardrobe."
      />

      <div className="mb-8 max-w-md">
        <SearchInput initialQ={input.q ?? ""} />
      </div>

      <Suspense key={`${input.q ?? ""}-${input.page}`} fallback={<GridSkeleton />}>
        <ResultGrid input={input} userId={user.id} />
      </Suspense>

      <p className="mt-10 text-sm text-[color:var(--fg-muted)]">
        Can&rsquo;t find it?{" "}
        <Link
          href="/fragrances/new"
          className="link-editorial inline-flex min-h-11 items-center text-[color:var(--fg)]"
        >
          Submit a missing fragrance
        </Link>
      </p>
    </div>
  );
}

async function ResultGrid({ input, userId }: { input: FragranceListInput; userId: string }) {
  const result = await listFragrances(userId, input);
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
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
      {result.items.map((f) => (
        <li key={f.id}>
          <Link
            href={`/fragrances/${f.id}`}
            className="flex min-h-11 items-center gap-4 rounded-lg border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-3 transition-colors hover:border-[color:var(--rule-strong)]"
          >
            <FragranceThumb imagePath={f.imagePath} />
            <div className="min-w-0">
              <p className="label-caps truncate">{f.brand.name}</p>
              <p className="truncate font-medium">{f.name}</p>
              <p className="text-sm text-[color:var(--fg-muted)]">
                {f.concentration}
                {f.releaseYear ? <> · {f.releaseYear}</> : null}
                {f.status === "PENDING" ? (
                  <Badge variant="outline" className="ml-2 align-middle">
                    Pending review
                  </Badge>
                ) : null}
              </p>
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
  const base =
    "inline-flex min-h-11 items-center rounded-sm border border-[color:var(--rule-strong)] px-3 tracking-wide";
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
      <div className="mt-4">
        <Button asChild variant="outline">
          <Link href={q ? `/fragrances/new?name=${encodeURIComponent(q)}` : "/fragrances/new"}>
            Submit a missing fragrance
          </Link>
        </Button>
      </div>
    </EmptyState>
  );
}

function GridSkeleton() {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="flex animate-pulse items-center gap-4 rounded-lg border border-[color:var(--rule)] p-3"
        >
          <div className="h-24 w-16 rounded-md bg-[color:var(--bg-sunken)]" />
          <div className="flex-1">
            <div className="h-3 w-20 rounded bg-[color:var(--bg-sunken)]" />
            <div className="mt-2 h-4 w-32 rounded bg-[color:var(--bg-sunken)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
