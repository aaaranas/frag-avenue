import Link from "next/link";
import type { WearCardData } from "@/modules/social/data";
import { MOOD_LABEL, OCCASION_LABEL, checkInSummary } from "@/modules/wear-logs";
import { formatDateTime } from "@/lib/format";
import { formatTemperature, type UnitSystem } from "@/lib/units";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { buildShareCard } from "@/components/share/share-card";
import { ShareWearButton } from "@/components/share/share-wear-button";
import { MessageCircle } from "lucide-react";
import { Avatar, displayName } from "./avatar";
import { KudosButton } from "./kudos-button";
import { VisibilityBadge } from "./visibility-badge";
import { WearStats, type WearStat } from "./wear-stats";

/**
 * A wear in the feed or on a profile: who and when, the scent, a stat strip
 * (sprays, occasion, mood, temperature), the check-in summary, then kudos and
 * comments — and, on your own wears, Share.
 */
export function WearCard({
  wear,
  viewerId,
  units,
}: {
  wear: WearCardData;
  viewerId: string;
  units: UnitSystem;
}) {
  const own = wear.userId === viewerId;
  const who = own ? "You" : displayName(wear.user);
  const scent = `${wear.fragrance.brand.name} ${wear.fragrance.name}`;
  const summary = checkInSummary(wear.checkIns);
  const comments = wear._count.comments;
  const stats: WearStat[] = [
    { label: "Sprays", value: String(wear.sprays) },
    {
      label: "Occasion",
      value: OCCASION_LABEL[wear.occasion as keyof typeof OCCASION_LABEL] ?? wear.occasion,
    },
  ];
  if (wear.mood) stats.push({ label: "Mood", value: MOOD_LABEL[wear.mood] });
  if (wear.temperatureC !== null) {
    stats.push({ label: "Temp", value: formatTemperature(wear.temperatureC, units) });
  }

  return (
    <article
      aria-label={`${who} wore ${scent}`}
      className="overflow-hidden rounded-xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)]"
    >
      <header className="flex items-center gap-3 px-4 pt-4">
        <Avatar name={displayName(wear.user)} image={wear.user.image} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold">
            {wear.user.username ? (
              <Link href={`/u/${wear.user.username}`} className="hover:underline">
                {who}
              </Link>
            ) : (
              who
            )}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--fg-muted)]">
            {formatDateTime(wear.wornAt, wear.timeZone)}
            {own ? <VisibilityBadge visibility={wear.visibility} /> : null}
          </p>
        </div>
      </header>

      <Link
        href={`/wears/${wear.id}`}
        className="block px-4 pt-3 pb-4 transition-colors hover:bg-[color:var(--bg-sunken)]/60"
      >
        <div className="flex items-center gap-4">
          <FragranceThumb
            imagePath={wear.fragrance.imagePath}
            kind={wear.collectionItem?.kind ?? "BOTTLE"}
          />
          <div className="min-w-0">
            <p className="truncate text-xl leading-tight font-semibold tracking-tight font-stretch-semi-condensed">
              {wear.fragrance.name}
            </p>
            <p className="truncate text-sm text-[color:var(--fg-muted)]">
              {wear.fragrance.brand.name}
            </p>
            {summary ? <p className="mt-1.5 text-sm">{summary}</p> : null}
          </div>
        </div>
        <WearStats stats={stats} className="mt-4" />
      </Link>

      <footer className="flex items-center gap-1 border-t border-[color:var(--rule)] px-2">
        <KudosButton
          wearId={wear.id}
          count={wear._count.kudos}
          given={wear.kudos.length > 0}
          own={own}
          label={own ? scent : `${who}'s ${wear.fragrance.name}`}
        />
        <Link
          href={`/wears/${wear.id}#comments`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-sunken)] hover:text-[color:var(--fg)]"
        >
          <MessageCircle className="size-4" aria-hidden />
          {comments} {comments === 1 ? "comment" : "comments"}
        </Link>
        {/* Only your own: an image of someone else's wear could carry it past who they chose. */}
        {own ? <ShareWearButton card={buildShareCard(wear, units)} /> : null}
      </footer>
    </article>
  );
}
