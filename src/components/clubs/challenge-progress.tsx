import type { ChallengeStatus } from "@/modules/analytics";

const UNIT = { UNIQUE_FRAGRANCES: "scents", UNIQUE_HOUSES: "houses" } as const;

/** One challenge with the viewer's progress: a meter plus the count in words. */
export function ChallengeProgress({
  title,
  description,
  kind,
  status,
}: {
  title: string;
  description: string | null;
  kind: "UNIQUE_FRAGRANCES" | "UNIQUE_HOUSES";
  status: ChallengeStatus;
}) {
  const text = status.complete
    ? `Complete — ${status.count} ${UNIT[kind]}`
    : `${status.count} of ${status.target} ${UNIT[kind]}`;
  return (
    <div className="rounded-lg border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-4">
      <h3 className="font-semibold">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-sm text-[color:var(--fg-muted)]">{description}</p>
      ) : null}
      <div className="mt-3 flex items-center gap-3">
        <div
          role="meter"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={status.target}
          aria-valuenow={Math.min(status.count, status.target)}
          aria-valuetext={text}
          className="h-2 flex-1 rounded-full bg-[color:var(--bg-sunken)]"
        >
          <div
            className="h-full rounded-full bg-[color:var(--accent-color)]"
            style={{ width: `${Math.round(status.fraction * 100)}%` }}
          />
        </div>
        <span className="numeric shrink-0 text-sm">{text}</span>
      </div>
    </div>
  );
}
