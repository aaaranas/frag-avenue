import { redirect } from "next/navigation";
import { currentUser } from "@/modules/auth/session";

/**
 * Sign-in / sign-up: the app name and the form, nothing else.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (user) redirect("/feed");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="mb-10 text-center text-3xl font-semibold tracking-tight">Frag Avenue</h1>
      {children}
    </main>
  );
}
