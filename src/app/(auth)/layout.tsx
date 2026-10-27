import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/modules/auth/session";
import { AppMark } from "@/components/brand/app-mark";

/** Sign-in / sign-up: the app name and the form, nothing else. */
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
    <main className="flex min-h-dvh flex-col items-center px-4 pt-12 pb-10 sm:justify-center sm:bg-[color:var(--bg-sunken)] sm:py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <p className="flex items-center gap-2.5 self-center text-lg font-semibold tracking-tight">
          <AppMark className="size-8" />
          Frag Avenue
        </p>
        {children}
      </div>
    </main>
  );
}
