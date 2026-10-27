import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/modules/auth/session";
import { findLogDefaults, findWearableItem, listWearableItems } from "@/modules/wear-logs/data";
import { KIND_LABEL, fillLabel, fillRatio, itemLabel } from "@/modules/wardrobe";
import { formatVolume } from "@/lib/units";
import { localDate, daysBetween, wallTime } from "@/lib/time-zone";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { CheckInPrompts } from "@/components/wear/check-in-prompts";
import { LogWearForm } from "./log-wear-form";
import { BackLink } from "@/components/ui/back-link";
import { ChevronRight, FlaskConical } from "lucide-react";

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
        <BackLink href="/log">Pick something else</BackLink>
        <h1 className="sr-only">Log a wear</h1>
        <div className="mt-2 mb-8 flex items-center gap-4">
          <FragranceThumb
            imagePath={item.fragrance.imagePath}
            kind={item.kind}
            fillRatio={fillRatio(item.bottleSizeMl, item.remainingMl)}
          />
          <div className="min-w-0">
            <p className="text-[1.625rem] leading-tight font-semibold tracking-tight font-stretch-semi-condensed">
              {item.fragrance.name}
            </p>
            <p className="text-sm text-[color:var(--fg-muted)]">{item.fragrance.brand.name}</p>
            <p className="mt-1 text-sm">
              {itemLabel(
                item.kind,
                item.bottleSizeMl !== null ? formatVolume(item.bottleSizeMl, defaults.units) : null,
              )}
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
      <PageHeader title="What are you wearing?" />
      {items.length === 0 ? (
        <EmptyState
          title="Nothing to wear yet"
          icon={<FlaskConical />}
          action={
            <Button asChild>
              <Link href="/fragrances">Find a fragrance</Link>
            </Button>
          }
        >
          Add a bottle, decant, or sample to your wardrobe first.
        </EmptyState>
      ) : (
        <ul
          className="divide-y divide-[color:var(--rule)] overflow-hidden rounded-xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)]"
          aria-label="Your wearable items"
        >
          {items.map((item) => {
            const last = item.wears[0]?.wornAt;
            const ago = last ? daysBetween(localDate(last, defaults.timezone), today) : null;
            const fill = fillLabel(fillRatio(item.bottleSizeMl, item.remainingMl));
            return (
              <li key={item.id}>
                <Link
                  href={`/log?item=${item.id}`}
                  className="flex min-h-11 items-center gap-4 p-3 transition-colors hover:bg-[color:var(--bg-sunken)]"
                >
                  <FragranceThumb
                    imagePath={item.fragrance.imagePath}
                    kind={item.kind}
                    fillRatio={fillRatio(item.bottleSizeMl, item.remainingMl)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.fragrance.name}</p>
                    <p className="truncate text-sm text-[color:var(--fg-muted)]">
                      {item.fragrance.brand.name}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--fg-muted)]">
                      {[
                        KIND_LABEL[item.kind],
                        fill,
                        ago === null
                          ? "never worn"
                          : ago === 0
                            ? "worn today"
                            : ago === 1
                              ? "worn yesterday"
                              : `last worn ${ago} days ago`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <ChevronRight
                    aria-hidden
                    className="size-5 shrink-0 text-[color:var(--fg-faint)]"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
