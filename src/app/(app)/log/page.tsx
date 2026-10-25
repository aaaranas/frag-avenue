import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/modules/auth/session";
import { findLogDefaults, findWearableItem, listWearableItems } from "@/modules/wear-logs/data";
import { KIND_LABEL, fillLabel, fillRatio } from "@/modules/wardrobe";
import { formatVolume } from "@/lib/units";
import { localDate, daysBetween, wallTime } from "@/lib/time-zone";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { CheckInPrompts } from "@/components/wear/check-in-prompts";
import { LogWearForm } from "./log-wear-form";

export const metadata = { title: "Log a wear" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// `item` is the param; `collectionItemId` is accepted from older links.
const Params = z.object({
  item: z.string().min(1).max(64).optional().catch(undefined),
  collectionItemId: z.string().min(1).max(64).optional().catch(undefined),
});

export default async function LogPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/log");
  const p = Params.parse(await searchParams);
  const itemId = p.item ?? p.collectionItemId;
  const defaults = await findLogDefaults(user.id);

  if (itemId) {
    const item = await findWearableItem(user.id, itemId);
    // Another user's item, a wishlist entry, or a deleted one: not found.
    if (!item) notFound();
    return (
      <div className="mx-auto max-w-xl">
        <Link
          href="/log"
          className="inline-flex min-h-11 items-center text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
        >
          ← Pick something else
        </Link>
        <h1 className="sr-only">Log a wear</h1>
        <div className="mt-2 mb-8 flex items-center gap-4">
          <FragranceThumb
            imagePath={item.fragrance.imagePath}
            kind={item.kind}
            fillRatio={fillRatio(item.bottleSizeMl, item.remainingMl)}
          />
          <div className="min-w-0">
            <p className="label-caps">{item.fragrance.brand.name}</p>
            <p className="text-xl font-semibold tracking-tight">{item.fragrance.name}</p>
            <p className="text-sm text-[color:var(--fg-muted)]">
              {KIND_LABEL[item.kind]}
              {item.bottleSizeMl !== null
                ? ` · ${formatVolume(item.bottleSizeMl, defaults.units)}`
                : ""}
            </p>
          </div>
        </div>
        <LogWearForm
          itemId={item.id}
          units={defaults.units}
          defaults={{
            wornAt: wallTime(new Date(), defaults.timezone),
            sprays: 3,
            occasion: "CASUAL",
            mood: "",
            notes: "",
            visibility: defaults.defaultVisibility,
          }}
        />
      </div>
    );
  }

  const items = await listWearableItems(user.id);
  const today = localDate(new Date(), defaults.timezone);

  return (
    <div className="mx-auto max-w-xl">
      <CheckInPrompts userId={user.id} />
      <PageHeader eyebrow="Log" title="What are you wearing?" />
      {items.length === 0 ? (
        <EmptyState title="Nothing to wear yet">
          Add a bottle, decant, or sample to your wardrobe first.
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/fragrances">Find a fragrance</Link>
            </Button>
          </div>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Your wearable items">
          {items.map((item) => {
            const last = item.wears[0]?.wornAt;
            const ago = last ? daysBetween(localDate(last, defaults.timezone), today) : null;
            const fill = fillLabel(fillRatio(item.bottleSizeMl, item.remainingMl));
            return (
              <li key={item.id}>
                <Link
                  href={`/log?item=${item.id}`}
                  className="flex min-h-11 items-center gap-4 rounded-lg border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-3 transition-colors hover:border-[color:var(--accent-color)]"
                >
                  <FragranceThumb
                    imagePath={item.fragrance.imagePath}
                    kind={item.kind}
                    fillRatio={fillRatio(item.bottleSizeMl, item.remainingMl)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="label-caps truncate">{item.fragrance.brand.name}</p>
                    <p className="truncate font-medium">{item.fragrance.name}</p>
                    <p className="text-sm text-[color:var(--fg-muted)]">
                      {KIND_LABEL[item.kind]}
                      {fill ? ` · ${fill}` : ""}
                    </p>
                    <p className="text-xs text-[color:var(--fg-muted)]">
                      {ago === null
                        ? "Never worn"
                        : ago === 0
                          ? "Worn today"
                          : ago === 1
                            ? "Worn yesterday"
                            : `Last worn ${ago} days ago`}
                    </p>
                  </div>
                  <span aria-hidden className="text-[color:var(--fg-muted)]">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
