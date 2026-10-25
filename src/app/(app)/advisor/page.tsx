import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { z } from "zod";
import { requireUser } from "@/modules/auth/session";
import { getRecommendations } from "@/modules/recommendations/data";
import { OCCASIONS } from "@/modules/wear-logs";
import { Bottle } from "@/components/bottle/bottle";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SHAPE_LABEL, fillLabel } from "@/lib/bottle-appearance";
import { AdvisorControls } from "./advisor-controls";

type SearchParams = Promise<{
  occasion?: string;
  temperatureC?: string;
  weatherCondition?: string;
}>;

export const metadata = { title: "What should I wear?" };
export const dynamic = "force-dynamic";

const Params = z.object({
  occasion: z.enum(OCCASIONS).catch("CASUAL").default("CASUAL"),
  temperatureC: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v) : null))
    .pipe(z.union([z.number().min(-50).max(60), z.null()]).catch(null)),
  weatherCondition: z
    .enum(["clear", "clouds", "rain", "snow", "storm", "fog"])
    .optional()
    .transform((v) => v ?? null),
});

export default async function AdvisorPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/advisor");
  const raw = await searchParams;
  const parsed = Params.parse(raw);
  const now = new Date();

  const { recommendations: recs, bottles } = await getRecommendations(user.id, {
    weather: { temperatureC: parsed.temperatureC, condition: parsed.weatherCondition },
    occasion: parsed.occasion,
    now,
    limit: 3,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Advisor"
        title="What should I wear?"
        subtitle="Suggestions from bottles you already own, with the reasoning shown."
      />

      <AdvisorControls
        initialOccasion={parsed.occasion}
        initialTemp={parsed.temperatureC?.toString() ?? ""}
        initialCondition={parsed.weatherCondition ?? ""}
      />

      {recs.length === 0 ? (
        <EmptyState title="Nothing to suggest yet.">
          Your wardrobe is empty.{" "}
          <Link href="/fragrances" className="link-editorial">
            Add a fragrance
          </Link>{" "}
          first.
        </EmptyState>
      ) : (
        <ol className="flex flex-col gap-4">
          {recs.map((r, i) => {
            const bottle = bottles.get(r.collectionItemId);
            const fill = fillLabel(bottle?.fillRatio ?? null);
            return (
              <li key={r.collectionItemId}>
                <Card className="p-6 md:p-7">
                  <div className="grid grid-cols-[auto_1fr_auto] items-start gap-5 md:gap-7">
                    <Link
                      href={`/fragrances/${r.fragranceId}`}
                      className="shrink-0 transition-transform hover:-translate-y-1"
                      aria-label={
                        bottle
                          ? `${r.brandName} ${r.fragranceName} — ${SHAPE_LABEL[bottle.shape]}` +
                            (fill ? `, ${fill.toLowerCase()}` : "")
                          : `${r.brandName} ${r.fragranceName}`
                      }
                    >
                      <Bottle
                        color={bottle?.color ?? "#a89680"}
                        shape={bottle?.shape}
                        capColor={bottle?.capColor}
                        finish={bottle?.finish}
                        fillRatio={bottle?.fillRatio ?? null}
                        size={72}
                        className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.12)]"
                      />
                    </Link>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="numeric flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-wash)] text-[11px] font-medium text-[color:var(--brand)]">
                          {i + 1}
                        </span>
                        <p className="label-caps">{r.brandName}</p>
                      </div>
                      <h2 className="mt-1 font-serif text-3xl leading-tight">
                        <Link
                          href={`/fragrances/${r.fragranceId}`}
                          className="inline-flex min-h-11 items-center decoration-[color:var(--rule-strong)] underline-offset-4 hover:underline hover:decoration-[color:var(--fg)]"
                        >
                          {r.fragranceName}
                        </Link>
                      </h2>
                    </div>

                    <div className="shrink-0 text-right">
                      {r.displayScore !== null ? (
                        <div>
                          <p className="numeric text-5xl leading-none font-medium text-[color:var(--brand)]">
                            {r.displayScore}
                            <span className="text-2xl text-[color:var(--fg-faint)]">%</span>
                          </p>
                          <p className="label-caps mt-1">Match</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-serif text-2xl leading-none text-[color:var(--accent-amber)] italic">
                            Suggested
                          </p>
                          <p className="label-caps mt-1">Cold-start</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {r.reasons.length > 0 ? (
                    <ul className="mt-6 flex flex-col gap-2 border-t border-[color:var(--rule)] pt-5 text-sm leading-relaxed text-[color:var(--fg-muted)]">
                      {r.reasons.map((reason, ri) => (
                        <li key={ri} className="flex gap-3">
                          <span
                            aria-hidden
                            className="mt-2 h-px w-4 shrink-0 bg-[color:var(--accent-amber)]"
                          />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Button asChild size="sm">
                      <Link
                        href={{
                          pathname: "/wear/new",
                          query: { collectionItemId: r.collectionItemId },
                        }}
                      >
                        Log this wear
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/fragrances/${r.fragranceId}`}>
                        View fragrance <ArrowRight />
                      </Link>
                    </Button>
                    {fill ? (
                      // The bottle drawing shows the level; this is the same fact in
                      // words, for anyone not reading the illustration.
                      <span className="ml-auto text-xs text-[color:var(--fg-faint)]">
                        {fill}
                        {bottle && bottle.remainingMl !== null ? (
                          <span className="tabular-nums"> · {bottle.remainingMl} ml left</span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      {recs.length > 0 && recs[0]?.coldStart ? (
        <p className="mt-6 flex items-start gap-2 text-xs text-[color:var(--fg-faint)]">
          <Chip>Cold-start</Chip>
          <span className="mt-1">
            Fewer than 10 wears logged. Preference and historical-performance factors are disabled
            until more data accrues.
          </span>
        </p>
      ) : null}
    </div>
  );
}
