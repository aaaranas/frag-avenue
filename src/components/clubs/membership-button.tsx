import { joinClubAction, leaveClubAction } from "@/modules/clubs";
import { Button } from "@/components/ui/button";

/** Join / Leave. `quiet` for list rows (see FollowButton). */
export function MembershipButton({
  clubId,
  isMember,
  name,
  quiet = false,
}: {
  clubId: string;
  isMember: boolean;
  name: string;
  quiet?: boolean;
}) {
  return (
    <form action={isMember ? leaveClubAction : joinClubAction}>
      <input type="hidden" name="clubId" value={clubId} />
      <Button
        type="submit"
        size="sm"
        variant={isMember ? (quiet ? "secondary" : "outline") : quiet ? "outline" : "default"}
        aria-label={isMember ? `Leave ${name}` : `Join ${name}`}
      >
        {isMember ? "Leave" : "Join"}
      </Button>
    </form>
  );
}
