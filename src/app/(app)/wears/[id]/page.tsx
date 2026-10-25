import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { findLogDefaults, findWearForUser } from "@/modules/wear-logs/data";
import {
  CHECK_IN_LABEL,
  MOOD_LABEL,
  OCCASION_LABEL,
  VISIBILITY_LABEL,
  checkInTimeline,
  deleteWearAction,
  type TimelineEntry,
} from "@/modules/wear-logs";
import { conditionLabel, weatherAttribution } from "@/modules/weather";
import { formatDateTime, formatTime } from "@/lib/format";
import { formatTemperature } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { CheckInButtons } from "@/components/wear/check-in-buttons";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Wear" };

export default async function WearPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser(`/wears/${id}`);
  const [wear, defaults] = await Promise.all([
    findWearForUser(user.id, id),
    findLogDefaults(user.id),
  ]);
  // Someone else's wear and a missing one look the same.
  if (!wear) notFound();

  const timeline = checkInTimeline(wear.wornAt, wear.checkIns, new Date());
  const attribution = weatherAttribution(wear.weatherProvider);
  const condition = conditionLabel(wear.weatherCondition);
  const remove = deleteWearAction.bind(null, wear.id);

  return (
    <article className="mx-auto max-w-xl">
      <Link
        href="/wears"
        className="inline-flex min-h-11 items-center text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
      >
        ← Your wears
      </Link>

      <header className="mt-2 flex items-center gap-4 border-b border-[color:var(--rule)] pb-6">
        <FragranceThumb
          imagePath={wear.fragrance.imagePath}
          kind={wear.collectionItem?.kind ?? "BOTTLE"}
        />
        <div className="min-w-0">
          <p className="label-caps">{wear.fragrance.brand.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{wear.fragrance.name}</h1>
          <p className="text-sm text-[color:var(--fg-muted)]">
            {formatDateTime(wear.wornAt, wear.timeZone)}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[color:var(--rule)] py-6 text-sm">
        <Item label="Sprays" value={String(wear.sprays)} />
        <Item
          label="Occasion"
          value={OCCASION_LABEL[wear.occasion as keyof typeof OCCASION_LABEL] ?? wear.occasion}
        />
        <Item label="Mood" value={wear.mood ? MOOD_LABEL[wear.mood] : "—"} />
        <Item label="Visible to" value={VISIBILITY_LABEL[wear.visibility]} />
        <div className="col-span-2">
          <dt className="text-xs text-[color:var(--fg-muted)]">Weather</dt>
          <dd className="mt-0.5">
            {wear.temperatureC !== null ? (
              <>
                {formatTemperature(wear.temperatureC, defaults.units)}
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
          <div className="col-span-2">
            <dt className="text-xs text-[color:var(--fg-muted)]">Note</dt>
            <dd className="mt-0.5 whitespace-pre-line">{wear.notes}</dd>
          </div>
        ) : null}
      </dl>

      <section
        aria-labelledby="checkins-heading"
        className="border-b border-[color:var(--rule)] py-6"
      >
        <h2 id="checkins-heading" className="mb-4 text-lg font-semibold">
          Check-ins
        </h2>
        <ol className="flex flex-col gap-4">
          {timeline.map((entry) => (
            <li key={entry.offsetHours} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium">{entry.offsetHours} hours</span>
                <span className="text-[color:var(--fg-muted)]">
                  {describe(entry, wear.timeZone)}
                </span>
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
      </section>

      <div className="flex flex-wrap items-center gap-3 py-6">
        <Button asChild variant="outline">
          <Link href={`/wears/${wear.id}/edit`}>Edit</Link>
        </Button>
        <form action={remove}>
          <button
            type="submit"
            className="min-h-11 rounded-md border border-[color:var(--fg)] px-4 text-sm font-medium hover:bg-[color:var(--bg-sunken)]"
          >
            Delete wear
          </button>
        </form>
      </div>
    </article>
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

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[color:var(--fg-muted)]">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
