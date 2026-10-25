import { requireUser } from "@/modules/auth/session";
import { CreateClubForm } from "./create-club-form";
import { BackLink } from "@/components/ui/back-link";

export const metadata = { title: "Start a club" };

export default async function NewClubPage() {
  await requireUser("/clubs/new");
  return (
    <div className="mx-auto max-w-xl">
      <BackLink href="/clubs">Clubs</BackLink>
      <h1 className="mt-2 mb-2 text-2xl font-semibold tracking-tight">Start a club</h1>
      <p className="mb-8 text-sm text-[color:var(--fg-muted)]">
        Anyone can join. Members see each other on the challenge leaderboards.
      </p>
      <CreateClubForm />
    </div>
  );
}
