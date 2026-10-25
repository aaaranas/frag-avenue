import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { findClubBySlug } from "@/modules/clubs/data";
import { getClubLeaderboards } from "@/modules/clubs/service";
import { Avatar, displayName } from "@/components/social/avatar";
import { MembershipButton } from "@/components/clubs/membership-button";
import { cn } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  return { title: `Club · ${(await params).slug}` };
}

const UNIT = { UNIQUE_FRAGRANCES: "scents", UNIQUE_HOUSES: "houses" } as const;

export default async function ClubPage({ params }: { params: Params }) {
  const { slug } = await params;
  const user = await requireUser(`/clubs/${slug}`);
  const club = await findClubBySlug(slug, user.id);
  if (!club) notFound();
  const boards = await getClubLeaderboards(club, user.id, new Date());
  const people = new Map(club.memberships.map((m) => [m.user.id, m.user]));
  const count = club.memberships.length;

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/clubs"
        className="inline-flex min-h-11 items-center text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
      >
        ← Clubs
      </Link>
      <header className="mt-2 mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{club.name}</h1>
          <p className="text-sm text-[color:var(--fg-muted)]">
            {count} {count === 1 ? "member" : "members"}
          </p>
          {club.description ? (
            <p className="mt-2 text-sm whitespace-pre-line">{club.description}</p>
          ) : null}
        </div>
        <MembershipButton clubId={club.id} isMember={club.isMember} name={club.name} />
      </header>

      {boards.map(({ challenge, standings }) => (
        <section key={challenge.id} aria-labelledby={`board-${challenge.id}`} className="mb-10">
          <h2 id={`board-${challenge.id}`} className="text-lg font-semibold">
            {challenge.title}
          </h2>
          <p className="mt-1 mb-4 text-sm text-[color:var(--fg-muted)]">
            Last {challenge.windowDays} days. Counts only wears you can see.
          </p>
          {standings.length === 0 ? (
            <p className="text-sm text-[color:var(--fg-muted)]">No members yet.</p>
          ) : (
            <ol
              className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]"
              aria-label={`${challenge.title} leaderboard`}
            >
              {standings.map((s) => {
                const person = people.get(s.userId)!;
                const you = s.userId === user.id;
                const name = you ? "You" : displayName(person);
                return (
                  <li key={s.userId} className="flex items-center gap-3 py-2">
                    <span className="numeric w-6 shrink-0 text-right text-sm text-[color:var(--fg-muted)]">
                      {s.rank}
                    </span>
                    <Avatar
                      name={displayName(person)}
                      image={person.image}
                      className="size-8 text-xs"
                    />
                    <span className={cn("min-w-0 flex-1 truncate text-sm", you && "font-semibold")}>
                      {person.username && !you ? (
                        <Link
                          href={`/u/${person.username}`}
                          className="inline-flex min-h-11 min-w-11 items-center hover:underline"
                        >
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </span>
                    {s.complete ? <Badge>Complete</Badge> : null}
                    <span className="numeric shrink-0 text-sm">
                      {s.count}/{s.target} {UNIT[challenge.kind]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
