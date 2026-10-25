import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { listClubs, type ClubListItem } from "@/modules/clubs/data";
import { getMyChallengeProgress } from "@/modules/clubs/service";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ChallengeProgress } from "@/components/clubs/challenge-progress";
import { MembershipButton } from "@/components/clubs/membership-button";

export const metadata = { title: "Clubs" };

export default async function ClubsPage() {
  const user = await requireUser("/clubs");
  const [progress, clubs] = await Promise.all([
    getMyChallengeProgress(user.id, new Date()),
    listClubs(user.id),
  ]);
  const mine = clubs.filter((c) => c.memberships.length > 0);
  const others = clubs.filter((c) => c.memberships.length === 0);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        eyebrow="Clubs"
        title="Clubs & challenges"
        actions={
          <Button asChild size="sm">
            <Link href="/clubs/new">Start a club</Link>
          </Button>
        }
      />

      <section aria-labelledby="challenges-heading" className="mb-10">
        <h2 id="challenges-heading" className="text-lg font-semibold">
          Your challenges
        </h2>
        <p className="mt-1 mb-4 text-sm text-[color:var(--fg-muted)]">
          Live from your wears over the last 30 days, ending today.
        </p>
        <div className="flex flex-col gap-3">
          {progress.map(({ challenge, status }) => (
            <ChallengeProgress
              key={challenge.id}
              title={challenge.title}
              description={challenge.description}
              kind={challenge.kind}
              status={status}
            />
          ))}
        </div>
      </section>

      <ClubSection
        id="mine"
        title="Your clubs"
        clubs={mine}
        empty="You haven't joined a club yet."
      />
      <ClubSection
        id="others"
        title={mine.length > 0 ? "More clubs" : "Clubs"}
        clubs={others}
        empty="No other clubs yet. Start one!"
      />
    </div>
  );
}

function ClubSection({
  id,
  title,
  clubs,
  empty,
}: {
  id: string;
  title: string;
  clubs: ClubListItem[];
  empty: string;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="mb-10">
      <h2 id={`${id}-heading`} className="mb-4 text-lg font-semibold">
        {title}
      </h2>
      {clubs.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2" aria-labelledby={`${id}-heading`}>
          {clubs.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-lg border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-3"
            >
              <Link
                href={`/clubs/${c.slug}`}
                className="flex min-h-11 min-w-0 flex-1 flex-col justify-center hover:underline"
              >
                <span className="truncate font-medium">{c.name}</span>
                <span className="truncate text-sm text-[color:var(--fg-muted)]">
                  {c._count.memberships} {c._count.memberships === 1 ? "member" : "members"}
                  {c.description ? ` · ${c.description}` : ""}
                </span>
              </Link>
              <MembershipButton clubId={c.id} isMember={c.memberships.length > 0} name={c.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
