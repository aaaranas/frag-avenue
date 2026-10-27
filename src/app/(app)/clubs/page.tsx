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
        title="Clubs & challenges"
        actions={
          <Button asChild size="sm">
            <Link href="/clubs/new">Start a club</Link>
          </Button>
        }
      />

      <section aria-labelledby="challenges-heading" className="mb-10">
        <h2 id="challenges-heading" className="text-lg font-semibold tracking-tight">
          Your challenges
        </h2>
        <p className="mt-0.5 mb-3 text-sm text-[color:var(--fg-muted)]">
          Counted from your wears in the last 30 days.
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
        empty="No other clubs yet. Start one and invite people in."
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
      <h2 id={`${id}-heading`} className="mb-3 text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {clubs.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <ul
          className="divide-y divide-[color:var(--rule)] overflow-hidden rounded-xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)]"
          aria-labelledby={`${id}-heading`}
        >
          {clubs.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3">
              <Link
                href={`/clubs/${c.slug}`}
                className="flex min-h-11 min-w-0 flex-1 flex-col justify-center hover:underline"
              >
                <span className="truncate font-semibold">{c.name}</span>
                <span className="text-sm text-[color:var(--fg-muted)]">
                  {c._count.memberships} {c._count.memberships === 1 ? "member" : "members"}
                </span>
                {c.description ? (
                  <span className="mt-0.5 line-clamp-1 text-sm">{c.description}</span>
                ) : null}
              </Link>
              <MembershipButton
                clubId={c.id}
                isMember={c.memberships.length > 0}
                name={c.name}
                quiet
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
