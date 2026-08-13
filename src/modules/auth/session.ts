import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

/**
 * Read the current session. Returns `null` when unauthenticated — does not redirect.
 * Use `requireUser()` when the caller must have a session.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.email) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    image: u.image ?? null,
  };
}

/**
 * Enforce authentication in a Server Component / server action / route handler.
 * Redirects to /sign-in with a `next=` parameter when unauthenticated.
 */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) {
    const search = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/sign-in${search}`);
  }
  return user;
}
