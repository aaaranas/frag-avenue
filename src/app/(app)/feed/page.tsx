import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { listFeed } from "@/modules/social/data";
import { Cursor } from "@/modules/social";
import { findLogDefaults } from "@/modules/wear-logs/data";
import { findProfileSettings } from "@/modules/users/data";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { CheckInPrompts } from "@/components/wear/check-in-prompts";
import { PickForToday } from "@/components/social/pick-for-today";
import { UsernamePrompt } from "@/components/social/username-prompt";
import { WearCard } from "@/components/social/wear-card";
import { Activity } from "lucide-react";

export const metadata = { title: "Feed" };

type SearchParams = Promise<{ cursor?: string | string[] }>;

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/feed");
  const cursor = Cursor.parse((await searchParams).cursor);
  const [feed, defaults, settings] = await Promise.all([
    listFeed(user.id, cursor),
    findLogDefaults(user.id),
    findProfileSettings(user.id),
  ]);
  const firstPage = !cursor;

  return (
    <div className="mx-auto max-w-xl">
      {firstPage ? (
        <>
          <CheckInPrompts userId={user.id} />
          {settings && !settings.username ? <UsernamePrompt /> : null}
        </>
      ) : null}
      <PageHeader
        title={firstPage ? "Today" : "Earlier"}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/people">Find people</Link>
          </Button>
        }
      />
      {firstPage ? <PickForToday userId={user.id} timeZone={defaults.timezone} /> : null}

      {feed.items.length === 0 ? (
        firstPage ? (
          <EmptyState
            title="Your feed is quiet"
            icon={<Activity />}
            action={
              <Button asChild variant="outline">
                <Link href="/people">Find people to follow</Link>
              </Button>
            }
          >
            Wears you log, and those of people you follow, show up here.
          </EmptyState>
        ) : (
          <EmptyState
            title="That's everything"
            action={
              <Button asChild variant="outline">
                <Link href="/feed">Back to the top</Link>
              </Button>
            }
          >
            You&rsquo;re all caught up.
          </EmptyState>
        )
      ) : (
        <ol className="flex flex-col gap-3" aria-label="Wears">
          {feed.items.map((w) => (
            <li key={w.id}>
              <WearCard wear={w} viewerId={user.id} units={defaults.units} />
            </li>
          ))}
        </ol>
      )}

      {feed.nextCursor ? (
        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline">
            <Link href={`/feed?cursor=${feed.nextCursor}`}>Load more</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
