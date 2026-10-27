import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { searchPeople } from "@/modules/social/data";
import { PeopleQuery } from "@/modules/social";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Avatar, displayName } from "@/components/social/avatar";
import { FollowButton } from "@/components/social/follow-button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Find people" };

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function PeoplePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/people");
  const q = PeopleQuery.parse((await searchParams).q);
  const people = await searchPeople(user.id, q);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Find people" />
      <form role="search" action="/people" className="mb-6 flex gap-2">
        <label htmlFor="people-q" className="sr-only">
          Search by username or name
        </label>
        <Input
          id="people-q"
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Username or name"
          autoCapitalize="none"
          spellCheck={false}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      {people.length === 0 ? (
        <EmptyState title={q ? "No one matches" : "No one here yet"}>
          {q ? "Try part of their username, or a different spelling." : "Invite a friend to join."}
        </EmptyState>
      ) : (
        <ul
          className="divide-y divide-[color:var(--rule)] overflow-hidden rounded-xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)]"
          aria-label="People"
        >
          {people.map((p) => {
            const name = displayName(p);
            return (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <Avatar name={name} image={p.image} />
                <Link
                  href={`/u/${p.username}`}
                  className="flex min-h-11 min-w-0 flex-1 flex-col justify-center hover:underline"
                >
                  <span className="truncate font-semibold">{name}</span>
                  <span className="truncate text-sm text-[color:var(--fg-muted)]">
                    @{p.username}, {p._count.followers}{" "}
                    {p._count.followers === 1 ? "follower" : "followers"}
                  </span>
                </Link>
                <FollowButton userId={p.id} following={p.followers.length > 0} name={name} quiet />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
