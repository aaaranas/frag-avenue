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
import { BackLink } from "@/components/ui/back-link";
import { ChevronRight, SearchX } from "lucide-react";

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
    <div className="mx-auto max-w-2xl">
      <BackLink href="/wardrobe">Wardrobe</BackLink>
      <PageHeader
        className="mt-2"
        title="Catalogue"
        subtitle="Find a fragrance to add to your wardrobe."
      />

      <div className="mb-6">
        <SearchInput initialQ={input.q ?? ""} />
      </div>

      <Suspense key={`${input.q ?? ""}-${input.page}`} fallback={<GridSkeleton />}>
        <ResultGrid input={input} userId={user.id} />
      </Suspense>

      <p className="mt-8 text-sm text-[color:var(--fg-muted)]">
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
    <ul className="divide-y divide-[color:var(--rule)] overflow-hidden rounded-xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)]">
      {result.items.map((f) => (
        <li key={f.id}>
          <Link
            href={`/fragrances/${f.id}`}
            className="flex min-h-11 items-center gap-4 p-3 transition-colors hover:bg-[color:var(--bg-sunken)]"
          >
            <FragranceThumb imagePath={f.imagePath} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{f.name}</p>
              <p className="truncate text-sm text-[color:var(--fg-muted)]">{f.brand.name}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--fg-muted)]">
                {[f.concentration, f.releaseYear].filter(Boolean).join(", ")}
                {f.status === "PENDING" ? <Badge variant="outline">Pending review</Badge> : null}
              </p>
            </div>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-[color:var(--fg-faint)]" />
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
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4 text-sm">
      <p className="text-[color:var(--fg-muted)]">
        {result.total} {result.total === 1 ? "fragrance" : "fragrances"}, page {result.page} of{" "}
        {pages}
      </p>
      <div className="flex gap-2">
        <PagerLink href={prevPage ? href(prevPage) : null} label="Previous" />
        <PagerLink href={nextPage ? href(nextPage) : null} label="Next" />
      </div>
    </nav>
  );
}

function PagerLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <Button variant="outline" size="sm" disabled>
        {label}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

function EmptyStateWithQ({ q }: { q?: string }) {
  return (
    <EmptyState
      title={q ? "No matches" : "The catalogue is empty"}
      icon={<SearchX />}
      action={
        <Button asChild variant="outline">
          <Link href={q ? `/fragrances/new?name=${encodeURIComponent(q)}` : "/fragrances/new"}>
            Submit a missing fragrance
          </Link>
        </Button>
      }
    >
      {q ? (
        <>
          Nothing matches <span className="font-medium">&ldquo;{q}&rdquo;</span>.
        </>
      ) : (
        "Submit the first fragrance and add it to your wardrobe."
      )}
    </EmptyState>
  );
}

function GridSkeleton() {
  return (
    <ul
      className="divide-y divide-[color:var(--rule)] overflow-hidden rounded-xl border border-[color:var(--rule)]"
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-4 p-3">
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
