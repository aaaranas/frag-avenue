import Link from "next/link";
import { findPickForToday } from "@/modules/social/data";
import { fillRatio } from "@/modules/wardrobe";
import { daysBetween, localDate } from "@/lib/time-zone";
import { fragranceHref } from "@/lib/back-to";
import { isVisibleToUser } from "@/modules/fragrances";
import { MaybeLink } from "@/components/ui/maybe-link";
import { Button } from "@/components/ui/button";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";

/**
 * "Pick for today": the least recently worn item you own. Weather-based
 * ranking comes later; this is deliberately simple and explainable.
 */
export async function PickForToday({ userId, timeZone }: { userId: string; timeZone: string }) {
  const pick = await findPickForToday(userId);
  if (!pick) return null;
  const { item, lastWornAt } = pick;
  const days = lastWornAt
    ? daysBetween(localDate(lastWornAt, timeZone), localDate(new Date(), timeZone))
    : null;
  const why =
    days === null
      ? "You haven't worn it yet."
      : days === 0
        ? "You've worn everything you own today."
        : `Last worn ${days === 1 ? "yesterday" : `${days} days ago`}, the longest gap in your wardrobe.`;
  // A rejected submission has no page any more.
  const scentHref = isVisibleToUser(item.fragrance, userId)
    ? fragranceHref(item.fragrance.id, "/feed")
    : null;

  return (
    <section aria-labelledby="pick-heading" className="mb-8">
      <h2 id="pick-heading" className="mb-3 text-lg font-semibold tracking-tight">
        Pick for today
      </h2>
      <div className="rounded-xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-4">
        <div className="flex items-center gap-4">
          {/* The photo and the name both open the scent's page; the name is the
              link announced to screen readers. */}
          <MaybeLink href={scentHref} decorative className="shrink-0 rounded-md">
            <FragranceThumb
              imagePath={item.fragrance.imagePath}
              kind={item.kind}
              fillRatio={fillRatio(item.bottleSizeMl, item.remainingMl)}
            />
          </MaybeLink>
          <div className="min-w-0 flex-1">
            <MaybeLink href={scentHref} className="block min-h-11">
              <p className="truncate text-xl leading-tight font-semibold tracking-tight font-stretch-semi-condensed group-hover:underline group-hover:underline-offset-4">
                {item.fragrance.name}
              </p>
              <p className="truncate text-sm text-[color:var(--fg-muted)]">
                {item.fragrance.brand.name}
              </p>
            </MaybeLink>
            <p className="mt-2 text-sm">{why}</p>
          </div>
        </div>
        <Button asChild className="mt-4 w-full sm:w-auto">
          <Link href={`/log?item=${item.id}`}>Wear it today</Link>
        </Button>
      </div>
    </section>
  );
}
