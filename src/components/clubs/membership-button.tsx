import { joinClubAction, leaveClubAction } from "@/modules/clubs";
import { Button } from "@/components/ui/button";

export function MembershipButton({
  clubId,
  isMember,
  name,
}: {
  clubId: string;
  isMember: boolean;
  name: string;
}) {
  return (
    <form action={isMember ? leaveClubAction : joinClubAction}>
      <input type="hidden" name="clubId" value={clubId} />
      <Button
        type="submit"
        size="sm"
        variant={isMember ? "outline" : "default"}
        aria-label={isMember ? `Leave ${name}` : `Join ${name}`}
      >
        {isMember ? "Leave" : "Join"}
      </Button>
    </form>
  );
}
