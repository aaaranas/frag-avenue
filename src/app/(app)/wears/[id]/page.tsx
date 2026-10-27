import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { findLogDefaults } from "@/modules/wear-logs/data";
import { findVisibleWear, type VisibleWear } from "@/modules/social/data";
import { deleteCommentAction } from "@/modules/social";
import {
  CHECK_IN_LABEL,
  MOOD_LABEL,
  OCCASION_LABEL,
  checkInSummary,
  checkInTimeline,
  deleteWearAction,
  type TimelineEntry,
} from "@/modules/wear-logs";
import { conditionLabel, weatherAttribution } from "@/modules/weather";
import { formatDateTime, formatTime } from "@/lib/format";
import { formatTemperature } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { CheckInButtons } from "@/components/wear/check-in-buttons";
import { Avatar, displayName } from "@/components/social/avatar";
import { KudosButton } from "@/components/social/kudos-button";
import { CommentForm } from "@/components/social/comment-form";
import { BackLink } from "@/components/ui/back-link";
import { VisibilityBadge } from "@/components/social/visibility-badge";
import { WearStats } from "@/components/social/wear-stats";
import { buildShareCard } from "@/components/share/share-card";
import { ShareWearButton } from "@/components/share/share-wear-button";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Wear" };

export default async function WearPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser(`/wears/${id}`);
  const [wear, defaults] = await Promise.all([
    findVisibleWear(user.id, id),
    findLogDefaults(user.id),
  ]);
  // Missing, or not visible to this viewer (private, or followers-only and not
  // following): both look the same.
  if (!wear) notFound();

  const own = wear.userId === user.id;
  const author = displayName(wear.user);
  const attribution = weatherAttribution(wear.weatherProvider);
  const condition = conditionLabel(wear.weatherCondition);

  return (
    <article className="mx-auto max-w-xl">
      <BackLink href={own ? "/wears" : wear.user.username ? `/u/${wear.user.username}` : "/feed"}>
        {own ? "Your wears" : author}
      </BackLink>

      <header className="mt-2 flex items-center gap-4 pb-5">
        <FragranceThumb
          imagePath={wear.fragrance.imagePath}
          kind={wear.collectionItem?.kind ?? "BOTTLE"}
        />
        <div className="min-w-0">
          <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight font-stretch-semi-condensed">
            {wear.fragrance.name}
          </h1>
          <p className="text-sm text-[color:var(--fg-muted)]">{wear.fragrance.brand.name}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {own ? null : <span className="font-medium">{author}</span>}
            <span className="text-[color:var(--fg-muted)]">
              {formatDateTime(wear.wornAt, wear.timeZone)}
            </span>
            {own ? <VisibilityBadge visibility={wear.visibility} /> : null}
          </p>
        </div>
      </header>

      <section aria-label="Details">
        <WearStats
          className="border-y border-[color:var(--rule)] py-4"
          stats={[
            { label: "Sprays", value: String(wear.sprays) },
            {
              label: "Occasion",
              value: OCCASION_LABEL[wear.occasion as keyof typeof OCCASION_LABEL] ?? wear.occasion,
            },
            { label: "Mood", value: wear.mood ? MOOD_LABEL[wear.mood] : "—" },
          ]}
        />

        <dl className="flex flex-col gap-4 py-5 text-sm">
          <div>
            <dt className="text-xs text-[color:var(--fg-muted)]">Weather</dt>
            <dd className="mt-0.5 text-base">
              {wear.temperatureC !== null ? (
                <>
                  <span className="numeric font-semibold">
                    {formatTemperature(wear.temperatureC, defaults.units)}
                  </span>
                  {wear.humidityPct !== null ? ` · ${wear.humidityPct}% humidity` : ""}
                  {condition ? ` · ${condition}` : ""}
                  {attribution ? (
                    <span className="mt-0.5 block text-xs text-[color:var(--fg-muted)]">
                      {attribution.href ? (
                        <a
                          href={attribution.href}
                          className="underline underline-offset-2"
                          rel="noopener"
                        >
                          {attribution.label}
                        </a>
                      ) : (
                        attribution.label
                      )}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-[color:var(--fg-muted)]">Not recorded</span>
              )}
            </dd>
          </div>
          {wear.notes ? (
            <div>
              <dt className="text-xs text-[color:var(--fg-muted)]">Note</dt>
              <dd className="mt-0.5 text-base whitespace-pre-line">{wear.notes}</dd>
            </div>
          ) : null}
        </dl>
        {/* Pulled left by the button's padding, so the heart lines up with the text above. */}
        <div className="border-b border-[color:var(--rule)] py-1 [&>*]:-ml-3">
          <KudosButton
            wearId={wear.id}
            count={wear._count.kudos}
            given={wear.kudos.length > 0}
            own={own}
            label={own ? wear.fragrance.name : `${author}'s ${wear.fragrance.name}`}
          />
        </div>
      </section>

      <section
        aria-labelledby="checkins-heading"
        className="border-b border-[color:var(--rule)] py-6"
      >
        <h2 id="checkins-heading" className="mb-4 text-lg font-semibold">
          Check-ins
        </h2>
        {own ? (
          <OwnerTimeline wear={wear} />
        ) : (
          <p className="text-sm">{checkInSummary(wear.checkIns) ?? "None yet."}</p>
        )}
      </section>

      <Comments wear={wear} viewerId={user.id} own={own} />

      {own ? (
        <div className="flex flex-wrap items-center gap-3 py-6">
          <ShareWearButton card={buildShareCard(wear, defaults.units)} variant="outline" />
          <Button asChild variant="outline">
            <Link href={`/wears/${wear.id}/edit`}>Edit</Link>
          </Button>
          <ConfirmAction
            action={deleteWearAction.bind(null, wear.id)}
            title="Delete this wear?"
            description="Its check-ins, kudos, and comments go with it. This can't be undone."
            confirmLabel="Delete"
            trigger={<Button variant="outline">Delete wear</Button>}
          />
        </div>
      ) : null}
    </article>
  );
}

/** The owner's interactive view: each check-in's state, with buttons when open. */
function OwnerTimeline({ wear }: { wear: VisibleWear }) {
  const timeline = checkInTimeline(wear.wornAt, wear.checkIns, new Date());
  return (
    <ol className="flex flex-col gap-4">
      {timeline.map((entry) => (
        <li key={entry.offsetHours} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="font-medium">{entry.offsetHours} hours</span>
            <span className="text-[color:var(--fg-muted)]">{describe(entry, wear.timeZone)}</span>
          </div>
          {entry.status === "open" ? (
            <CheckInButtons
              wearId={wear.id}
              offsetHours={entry.offsetHours}
              label={`How is it doing at ${entry.offsetHours} hours?`}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Comments({ wear, viewerId, own }: { wear: VisibleWear; viewerId: string; own: boolean }) {
  return (
    <section
      aria-labelledby="comments-heading"
      id="comments"
      className="border-b border-[color:var(--rule)] py-6"
    >
      <h2 id="comments-heading" className="mb-4 text-lg font-semibold">
        Comments
      </h2>
      {wear.comments.length === 0 ? (
        <p className="mb-4 text-sm text-[color:var(--fg-muted)]">No comments yet.</p>
      ) : (
        <ol className="mb-6 flex flex-col gap-4" aria-label="Comments">
          {wear.comments.map((c) => {
            const mine = c.userId === viewerId;
            const name = mine ? "You" : displayName(c.user);
            return (
              <li key={c.id} className="flex gap-3">
                <Avatar
                  name={displayName(c.user)}
                  image={c.user.image}
                  className="size-8 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {c.user.username && !mine ? (
                      <Link href={`/u/${c.user.username}`} className="font-medium hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <span className="font-medium">{name}</span>
                    )}
                  </p>
                  <p className="text-sm break-words whitespace-pre-line">{c.body}</p>
                  {/* Authors can delete their comments; owners any comment on their wear. */}
                  {mine || own ? (
                    <ConfirmAction
                      action={deleteCommentAction}
                      fields={{ commentId: c.id }}
                      title="Delete this comment?"
                      description="It's removed for everyone. This can't be undone."
                      confirmLabel="Delete"
                      trigger={
                        <button
                          type="button"
                          className="min-h-11 min-w-11 text-left text-xs text-[color:var(--fg-muted)] underline underline-offset-2 hover:text-[color:var(--fg)]"
                          aria-label={`Delete comment by ${name}`}
                        >
                          Delete
                        </button>
                      }
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <CommentForm wearId={wear.id} />
    </section>
  );
}

function describe(entry: TimelineEntry, timeZone: string): string {
  switch (entry.status) {
    case "answered":
      return CHECK_IN_LABEL[entry.result];
    case "open":
      return "How is it doing?";
    case "upcoming":
      return `Opens at ${formatTime(entry.opensAt, timeZone)}`;
    case "missed":
      return "Not answered";
    case "stopped":
      return "Not needed — gone";
  }
}
