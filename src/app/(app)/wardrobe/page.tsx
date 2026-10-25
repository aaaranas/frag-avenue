import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import {
  countWardrobeByKind,
  listWardrobeForUser,
  type WardrobeListItem,
} from "@/modules/wardrobe/data";
import { findUserPreferences } from "@/modules/users/data";
import {
  ITEM_KINDS,
  KIND_FILTER_LABEL,
  KIND_LABEL,
  WardrobeFilter,
  fillLabel,
  fillRatio,
  itemCostPerWearMinor,
  wearCountLabel,
  type ItemKind,
} from "@/modules/wardrobe";
import { formatMoney } from "@/modules/analytics";
import { formatVolume, type UnitSystem } from "@/lib/units";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { cn } from "@/lib/utils";

export const metadata = { title: "Wardrobe" };

type SearchParams = Promise<{ type?: string | string[] }>;

export default async function WardrobePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/wardrobe");
  const kind = WardrobeFilter.parse((await searchParams).type);
  const [items, counts, prefs] = await Promise.all([
    listWardrobeForUser(user.id, kind),
    countWardrobeByKind(user.id),
    findUserPreferences(user.id),
  ]);
  const units: UnitSystem = prefs?.units ?? "METRIC";
  const total = ITEM_KINDS.reduce((n, k) => n + (counts[k] ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Wardrobe"
        title="Your wardrobe"
        actions={
          <Button asChild>
            <Link href="/fragrances">Add a fragrance</Link>
          </Button>
        }
      />

      {total === 0 ? (
        <EmptyState title="Nothing here yet">
          Find a fragrance in the{" "}
          <Link href="/fragrances" className="link-editorial">
            catalogue
          </Link>{" "}
          and add it as a bottle, decant, sample, or wishlist entry.
        </EmptyState>
      ) : (
        <>
          <FilterTabs active={kind} counts={counts} total={total} />
          {items.length === 0 ? (
            <EmptyState title={`No ${KIND_FILTER_LABEL[kind!].toLowerCase()} yet`}>
              <Link href="/fragrances" className="link-editorial">
                Add one from the catalogue
              </Link>
              .
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Wardrobe items">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} units={units} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FilterTabs({
  active,
  counts,
  total,
}: {
  active: ItemKind | undefined;
  counts: Partial<Record<ItemKind, number>>;
  total: number;
}) {
  const tabs: Array<{ key: string; label: string; count: number; href: string; current: boolean }> =
    [
      { key: "all", label: "All", count: total, href: "/wardrobe", current: !active },
      ...ITEM_KINDS.map((k) => ({
        key: k,
        label: KIND_FILTER_LABEL[k],
        count: counts[k] ?? 0,
        href: `/wardrobe?type=${k.toLowerCase()}`,
        current: active === k,
      })),
    ];
  return (
    <nav aria-label="Filter by type" className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={t.current ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors",
                t.current
                  ? "border-[color:var(--accent-color)] bg-[color:var(--accent-color)] font-medium text-[color:var(--accent-fg)]"
                  : "border-[color:var(--rule-strong)] text-[color:var(--fg)] hover:bg-[color:var(--bg-sunken)]",
              )}
            >
              {t.label}
              <span className={cn("tabular-nums", t.current ? "" : "text-[color:var(--fg-muted)]")}>
                {t.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ItemCard({ item, units }: { item: WardrobeListItem; units: UnitSystem }) {
  const wishlist = item.kind === "WISHLIST";
  const wears = item._count.wears;
  const ratio = wishlist ? null : fillRatio(item.bottleSizeMl, item.remainingMl);
  const cpw = itemCostPerWearMinor(item.kind, item.purchasePriceMinor, wears);
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: item.currency! });
  const name = `${item.fragrance.brand.name} ${item.fragrance.name}`;

  return (
    <li className="flex gap-4 rounded-lg border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-4">
      <FragranceThumb imagePath={item.fragrance.imagePath} kind={item.kind} fillRatio={ratio} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <p className="label-caps truncate">{item.fragrance.brand.name}</p>
          <h2 className="truncate text-base font-medium">{item.fragrance.name}</h2>
          <p className="text-sm text-[color:var(--fg-muted)]">
            {KIND_LABEL[item.kind]}
            {item.bottleSizeMl !== null ? <> · {formatVolume(item.bottleSizeMl, units)}</> : null}
            {item.fragrance.status === "PENDING" ? <> · Pending review</> : null}
          </p>
        </div>

        {wishlist ? null : <FillMeter ratio={ratio} />}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <dt className="text-xs text-[color:var(--fg-muted)]">
              {wishlist ? "Expected" : "Paid"}
            </dt>
            <dd className="tabular-nums">
              {item.purchasePriceMinor !== null ? money(item.purchasePriceMinor) : "—"}
            </dd>
          </div>
          {wishlist ? null : (
            <div>
              <dt className="text-xs text-[color:var(--fg-muted)]">Cost per wear</dt>
              <dd className="tabular-nums">
                {cpw !== null ? money(cpw) : "—"}{" "}
                <span className="text-xs text-[color:var(--fg-muted)]">
                  ({wearCountLabel(wears)})
                </span>
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-1 flex flex-wrap gap-2">
          {wishlist ? null : (
            <Button asChild size="sm">
              <Link href={`/log?collectionItemId=${item.id}`} aria-label={`Log a wear of ${name}`}>
                Log wear
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/wardrobe/${item.id}`} aria-label={`Edit ${name}`}>
              Edit
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

function FillMeter({ ratio }: { ratio: number | null }) {
  const label = fillLabel(ratio);
  if (label === null) {
    return <p className="text-xs text-[color:var(--fg-muted)]">Fill level not set</p>;
  }
  return (
    <div className="flex items-center gap-3">
      <div
        role="meter"
        aria-label="Fill level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio! * 100)}
        aria-valuetext={label}
        className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--bg-sunken)] ring-1 ring-[color:var(--rule-strong)] ring-inset"
      >
        <div
          className="h-full rounded-full bg-[color:var(--accent-color)]"
          style={{ width: `${Math.round(ratio! * 100)}%` }}
        />
      </div>
      <span className="text-xs whitespace-nowrap text-[color:var(--fg-muted)]">{label}</span>
    </div>
  );
}
