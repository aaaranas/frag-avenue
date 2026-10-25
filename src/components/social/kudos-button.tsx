"use client";

import { useOptimistic, startTransition } from "react";
import { toggleKudosAction } from "@/modules/social";
import { cn } from "@/lib/utils";

/**
 * Kudos toggle. Updates instantly (optimistic) and posts a plain form, so it
 * also works without JavaScript. The server re-checks visibility and refuses
 * kudos on your own wear; on your own wear this renders the count only.
 */
export function KudosButton({
  wearId,
  count,
  given,
  own,
  label,
}: {
  wearId: string;
  count: number;
  given: boolean;
  own: boolean;
  /** What the kudos is for, e.g. "Mika's Aventus". */
  label: string;
}) {
  const [state, setState] = useOptimistic({ count, given }, (s) => ({
    given: !s.given,
    count: s.count + (s.given ? -1 : 1),
  }));
  const text = `${state.count} ${state.count === 1 ? "kudo" : "kudos"}`;

  if (own) {
    return (
      <span className="inline-flex min-h-11 items-center text-sm text-[color:var(--fg-muted)]">
        {text}
      </span>
    );
  }

  return (
    <form
      action={toggleKudosAction}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          setState(null);
          await toggleKudosAction(data);
        });
      }}
    >
      <input type="hidden" name="wearId" value={wearId} />
      <button
        type="submit"
        aria-pressed={state.given}
        aria-label={`${state.given ? "Remove kudos from" : "Give kudos to"} ${label}`}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
          state.given
            ? "border-[color:var(--accent-color)] bg-[color:var(--accent-wash)] font-medium text-[color:var(--accent-color)]"
            : "border-[color:var(--rule-strong)] hover:bg-[color:var(--bg-sunken)]",
        )}
      >
        <span aria-hidden>{state.given ? "♥" : "♡"}</span>
        <span>{text}</span>
      </button>
    </form>
  );
}
