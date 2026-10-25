import { followAction, unfollowAction } from "@/modules/social";
import { Button } from "@/components/ui/button";

/** Follow / Following toggle as a plain form post. */
export function FollowButton({
  userId,
  following,
  name,
}: {
  userId: string;
  following: boolean;
  name: string;
}) {
  return (
    <form action={following ? unfollowAction : followAction}>
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="submit"
        size="sm"
        variant={following ? "outline" : "default"}
        aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
      >
        {following ? "Following" : "Follow"}
      </Button>
    </form>
  );
}
