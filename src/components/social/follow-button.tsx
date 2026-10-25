import { followAction, unfollowAction } from "@/modules/social";
import { Button } from "@/components/ui/button";

/**
 * Follow / Following toggle as a plain form post. `quiet` is for rows in a
 * list, where a filled accent button on every row would drown the page's own
 * action; on a profile it is the main action and stays filled.
 */
export function FollowButton({
  userId,
  following,
  name,
  quiet = false,
}: {
  userId: string;
  following: boolean;
  name: string;
  quiet?: boolean;
}) {
  return (
    <form action={following ? unfollowAction : followAction}>
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="submit"
        size="sm"
        variant={following ? (quiet ? "secondary" : "outline") : quiet ? "outline" : "default"}
        aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
      >
        {following ? "Following" : "Follow"}
      </Button>
    </form>
  );
}
