import { CHECK_IN_LABEL, CHECK_IN_RESULTS, recordCheckInAction } from "@/modules/wear-logs";

/**
 * Strong / Faint / Gone for one open check-in. A plain form post: works
 * without JavaScript, and the server re-checks that the prompt is still open.
 */
export function CheckInButtons({
  wearId,
  offsetHours,
  label,
}: {
  wearId: string;
  offsetHours: number;
  /** Accessible group name, e.g. "Aventus at 4 hours". */
  label: string;
}) {
  return (
    <form action={recordCheckInAction} aria-label={label}>
      <input type="hidden" name="wearId" value={wearId} />
      <input type="hidden" name="offsetHours" value={offsetHours} />
      <div className="grid grid-cols-3 gap-2">
        {CHECK_IN_RESULTS.map((r) => (
          <button
            key={r}
            type="submit"
            name="result"
            value={r}
            className="min-h-11 rounded-md border border-[color:var(--rule-strong)] bg-[color:var(--bg-elev)] px-3 text-sm font-medium transition-colors hover:border-[color:var(--accent-color)] hover:bg-[color:var(--accent-wash)]"
          >
            {CHECK_IN_LABEL[r]}
          </button>
        ))}
      </div>
    </form>
  );
}
