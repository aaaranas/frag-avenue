import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/modules/auth/session";
import { AppMark } from "@/components/brand/app-mark";

/**
 * Sign-in / sign-up: the app name and the form, nothing else. A soft glow of
 * the accent behind the mark is the only decoration (a tint of the one accent,
 * not a new colour).
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
    <main className="relative isolate flex min-h-dvh flex-col items-center px-4 pt-14 pb-10 sm:justify-center sm:pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--accent-color)_16%,transparent),transparent)]"
      />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <AppMark className="size-14 shadow-md" />
          <h1 className="text-[1.75rem] leading-none font-semibold tracking-tight">Frag Avenue</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
