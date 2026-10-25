import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/modules/auth/session";
import { AppMark } from "@/components/brand/app-mark";

/**
 * Sign-in / sign-up: the app name and the form, nothing else.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (user) {
    // A failed "Connect Google" (signed in) comes back here with ?error=; the
    // profile is where that message belongs. The layout cannot read search
    // params, so it reads the path header src/middleware.ts sets.
    const path = (await headers()).get("x-pathname") ?? "";
    const error = new URLSearchParams(path.split("?")[1] ?? "").get("error");
    redirect(error ? `/profile?error=${encodeURIComponent(error)}` : "/feed");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12 sm:max-w-md">
      <div className="mb-8 flex flex-col items-center gap-4">
        <AppMark className="size-14" />
        <h1 className="text-2xl font-semibold tracking-tight">Frag Avenue</h1>
      </div>
      {children}
    </main>
  );
}
