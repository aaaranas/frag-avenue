import Link from "next/link";
import type { WearCardData } from "@/modules/social/data";
import { MOOD_LABEL, OCCASION_LABEL, checkInSummary } from "@/modules/wear-logs";
import { formatDateTime } from "@/lib/format";
import { formatTemperature, type UnitSystem } from "@/lib/units";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { Avatar, displayName } from "./avatar";
import { KudosButton } from "./kudos-button";
import { VisibilityBadge } from "./visibility-badge";

/**
 * A wear in the feed or on a profile: who, scent, sprays, occasion,
 * temperature, check-in summary, kudos, and comment count.
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
  const details = [
    `${wear.sprays} ${wear.sprays === 1 ? "spray" : "sprays"}`,
    OCCASION_LABEL[wear.occasion as keyof typeof OCCASION_LABEL] ?? wear.occasion,
    wear.mood ? MOOD_LABEL[wear.mood] : null,
    wear.temperatureC !== null ? formatTemperature(wear.temperatureC, units) : null,
  ].filter(Boolean);

  return (
    <article
      aria-label={`${who} wore ${scent}`}
      className="rounded-lg border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-4"
    >
      <header className="flex items-center gap-3">
        <Avatar name={displayName(wear.user)} image={wear.user.image} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
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
        className="mt-3 flex items-center gap-4 rounded-md hover:bg-[color:var(--bg-sunken)]"
      >
        <FragranceThumb
          imagePath={wear.fragrance.imagePath}
          kind={wear.collectionItem?.kind ?? "BOTTLE"}
        />
        <div className="min-w-0">
          <p className="label-caps truncate">{wear.fragrance.brand.name}</p>
          <p className="truncate text-lg font-semibold tracking-tight">{wear.fragrance.name}</p>
          <p className="text-sm text-[color:var(--fg-muted)]">{details.join(" · ")}</p>
          {summary ? <p className="mt-0.5 text-sm">{summary}</p> : null}
        </div>
      </Link>

      <footer className="mt-3 flex items-center gap-3 border-t border-[color:var(--rule)] pt-3">
        <KudosButton
          wearId={wear.id}
          count={wear._count.kudos}
          given={wear.kudos.length > 0}
          own={own}
          label={own ? scent : `${who}'s ${wear.fragrance.name}`}
        />
        <Link
          href={`/wears/${wear.id}#comments`}
          className="inline-flex min-h-11 items-center px-2 text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
        >
          {comments} {comments === 1 ? "comment" : "comments"}
        </Link>
      </footer>
    </article>
  );
}
