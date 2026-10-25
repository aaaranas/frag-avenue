import Link from "next/link";
import { listRecentWearsForCheckIns } from "@/modules/wear-logs/data";
import { dueCheckIn } from "@/modules/wear-logs";
import { CheckInButtons } from "./check-in-buttons";

/**
 * In-app check-in prompts: one card per wear with a check-in open right now.
 * Rendered by pages (not the layout, which does not re-render on navigation),
 * so it is fresh on every visit. Renders nothing when nothing is due.
 */
export async function CheckInPrompts({ userId }: { userId: string }) {
  const now = new Date();
  const wears = await listRecentWearsForCheckIns(userId, now);
  const due = wears
    .map((w) => ({ wear: w, offset: dueCheckIn(w.wornAt, w.checkIns, now) }))
    .filter((d): d is { wear: (typeof wears)[number]; offset: 2 | 4 | 8 } => d.offset !== null);
  if (due.length === 0) return null;

  return (
    <section aria-label="Check-ins" className="mb-8 flex flex-col gap-3">
      {due.map(({ wear, offset }) => (
        <div
          key={wear.id}
          className="rounded-lg border border-[color:var(--accent-line)] bg-[color:var(--accent-wash)] p-4"
        >
          <p className="mb-3 text-sm">
            <span className="font-medium">{offset} hours in:</span> how is{" "}
            <Link href={`/wears/${wear.id}`} className="link-editorial font-medium">
              {wear.fragrance.name}
            </Link>{" "}
            doing?
          </p>
          <CheckInButtons
            wearId={wear.id}
            offsetHours={offset}
            label={`${wear.fragrance.name} at ${offset} hours`}
          />
        </div>
      ))}
    </section>
  );
}
