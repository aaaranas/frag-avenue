import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { listCollectionForUser } from "@/modules/collection/data";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

function formatMoney(minor: number | null, currency: string | null): string | null {
  if (minor === null || !currency) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function conditionLabel(c: "NEW" | "USED" | "DECANT"): string {
  return c === "NEW" ? "New" : c === "USED" ? "Used" : "Decant";
}

export default async function CollectionPage() {
  const user = await requireUser("/collection");
  const items = await listCollectionForUser(user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Wardrobe"
        title="Collection"
        actions={
          <Link
            href="/fragrances"
            className="rounded-sm border border-[color:var(--rule-strong)] px-3 py-1.5 text-xs tracking-wide hover:bg-[color:var(--bg-elev)]"
          >
            Browse catalogue
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState title="Your collection is empty.">
          <Link href="/fragrances" className="link-editorial">
            Add your first fragrance
          </Link>{" "}
          from the catalogue.
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
          {items.map((item) => {
            const money = formatMoney(item.purchasePriceMinor, item.currency);
            return (
              <li
                key={item.id}
                className="grid grid-cols-[1fr_auto] items-start gap-4 py-5 md:grid-cols-[1fr_auto_auto]"
              >
                <div className="min-w-0">
                  <p className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
                    {item.fragrance.brand.name}
                  </p>
                  <p className="mt-1 font-serif text-lg leading-snug">
                    <Link href={`/fragrances/${item.fragrance.id}`} className="link-editorial">
                      {item.fragrance.name}
                    </Link>
                  </p>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--fg-muted)]">
                    <span className="tabular-nums">{item.bottleSizeMl} ml</span>
                    {item.remainingMl !== null ? (
                      <span className="tabular-nums">{item.remainingMl} ml remaining</span>
                    ) : null}
                    <span>{conditionLabel(item.condition)}</span>
                    {money ? <span className="tabular-nums">{money}</span> : null}
                  </p>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
                  <Link
                    href={{ pathname: "/wear/new", query: { collectionItemId: item.id } }}
                    className="rounded-sm bg-[color:var(--fg)] px-3 py-1.5 text-xs font-medium tracking-wide text-[color:var(--bg)]"
                  >
                    Log wear
                  </Link>
                  <Link
                    href={`/collection/${item.id}/edit`}
                    className="rounded-sm border border-[color:var(--rule-strong)] px-3 py-1.5 text-xs hover:bg-[color:var(--bg-elev)]"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
