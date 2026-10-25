import { redirect } from "next/navigation";
import { currentUser } from "@/modules/auth/session";

/**
 * No marketing page: the entry point is the sign-in screen. Signed-in users go
 * straight to the app.
 */
export default async function RootPage(): Promise<never> {
  const user = await currentUser();
  redirect(user ? "/feed" : "/sign-in");
}
