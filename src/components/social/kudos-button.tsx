"use client";

import { useOptimistic, startTransition } from "react";
import { toggleKudosAction } from "@/modules/social";
import { Heart } from "lucide-react";
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
      <span className="inline-flex min-h-11 items-center gap-2 px-3 text-sm text-[color:var(--fg-muted)]">
        <Heart className="size-4" aria-hidden />
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
          "inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm transition-colors hover:bg-[color:var(--bg-sunken)]",
          // Given: accent and a filled heart — never colour alone.
          state.given
            ? "font-medium text-[color:var(--accent-color)]"
            : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
        )}
      >
        <Heart className={cn("size-4", state.given && "fill-current")} aria-hidden />
        <span>{text}</span>
      </button>
    </form>
  );
}
