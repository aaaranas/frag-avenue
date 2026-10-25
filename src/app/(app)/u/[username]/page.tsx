import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { findProfileByUsername, isFollowing, listProfileWears } from "@/modules/social/data";
import { Cursor } from "@/modules/social";
import { findLogDefaults } from "@/modules/wear-logs/data";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Avatar, displayName } from "@/components/social/avatar";
import { FollowButton } from "@/components/social/follow-button";
import { WearCard } from "@/components/social/wear-card";
import { Activity } from "lucide-react";

type Params = Promise<{ username: string }>;
type SearchParams = Promise<{ cursor?: string | string[] }>;

export async function generateMetadata({ params }: { params: Params }) {
  return { title: `@${(await params).username.toLowerCase()}` };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { username } = await params;
  const viewer = await requireUser(`/u/${username}`);
  const profile = await findProfileByUsername(decodeURIComponent(username));
  if (!profile) notFound();

  const cursor = Cursor.parse((await searchParams).cursor);
  const self = profile.id === viewer.id;
  const [wears, following, defaults] = await Promise.all([
    listProfileWears(profile.id, viewer.id, cursor),
    self ? Promise.resolve(false) : isFollowing(viewer.id, profile.id),
    findLogDefaults(viewer.id),
  ]);
  const name = displayName(profile);

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-8 flex items-start gap-4">
        <Avatar name={name} image={profile.image} className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-[color:var(--fg-muted)]">@{profile.username}</p>
          {profile.bio ? <p className="mt-2 text-sm whitespace-pre-line">{profile.bio}</p> : null}
          <p className="mt-2 text-sm">
            <span className="font-medium tabular-nums">{profile._count.followers}</span>{" "}
            <span className="text-[color:var(--fg-muted)]">
              {profile._count.followers === 1 ? "follower" : "followers"}
            </span>
            {" · "}
            <span className="font-medium tabular-nums">{profile._count.following}</span>{" "}
            <span className="text-[color:var(--fg-muted)]">following</span>
          </p>
          <div className="mt-3">
            {self ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/profile">Edit profile</Link>
              </Button>
            ) : (
              <FollowButton userId={profile.id} following={following} name={name} />
            )}
          </div>
        </div>
      </header>

      <h2 className="sr-only">Wears</h2>
      {wears.items.length === 0 ? (
        <EmptyState title="No wears to show" icon={<Activity />}>
          {self
            ? "Wears you log appear here."
            : following
              ? "Nothing shared with followers yet."
              : "Follow to see wears shared with followers."}
        </EmptyState>
      ) : (
        <ol className="flex flex-col gap-3" aria-label="Wears">
          {wears.items.map((w) => (
            <li key={w.id}>
              <WearCard wear={w} viewerId={viewer.id} units={defaults.units} />
            </li>
          ))}
        </ol>
      )}
      {wears.nextCursor ? (
        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline">
            <Link href={`/u/${profile.username}?cursor=${wears.nextCursor}`}>Load more</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
