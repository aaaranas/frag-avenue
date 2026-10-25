import Link from "next/link";
import { findPickForToday } from "@/modules/social/data";
import { KIND_LABEL, fillRatio } from "@/modules/wardrobe";
import { daysBetween, localDate } from "@/lib/time-zone";
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
        ? "Everything else was worn more recently — even this one was worn today."
        : `Your least recently worn — last worn ${days === 1 ? "yesterday" : `${days} days ago`}.`;

  return (
    <section
      aria-labelledby="pick-heading"
      className="mb-6 rounded-xl border border-[color:var(--accent-line)] bg-[color:var(--accent-wash)] p-4"
    >
      <h2 id="pick-heading" className="label-caps">
        Pick for today
      </h2>
      <div className="mt-2 flex items-center gap-4">
        <FragranceThumb
          imagePath={item.fragrance.imagePath}
          kind={item.kind}
          fillRatio={fillRatio(item.bottleSizeMl, item.remainingMl)}
        />
        <div className="min-w-0 flex-1">
          <p className="label-caps truncate">{item.fragrance.brand.name}</p>
          <p className="truncate text-lg font-semibold tracking-tight">{item.fragrance.name}</p>
          <p className="text-sm text-[color:var(--fg-muted)]">
            {KIND_LABEL[item.kind]} · {why}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Button asChild size="sm">
          <Link href={`/log?item=${item.id}`}>Wear it today</Link>
        </Button>
      </div>
    </section>
  );
}
