import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { CreateClubForm } from "./create-club-form";

export const metadata = { title: "Start a club" };

export default async function NewClubPage() {
  await requireUser("/clubs/new");
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/clubs"
        className="inline-flex min-h-11 items-center text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
      >
        ← Clubs
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-semibold tracking-tight">Start a club</h1>
      <p className="mb-8 text-sm text-[color:var(--fg-muted)]">
        Anyone can join. Members see each other on the challenge leaderboards.
      </p>
      <CreateClubForm />
    </div>
  );
}
