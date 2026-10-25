import { headers } from "next/headers";
import { PrimaryNav } from "@/components/shell/primary-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { TimeZoneNudge } from "@/components/shell/time-zone-nudge";
import { requireUser } from "@/modules/auth/session";
import { findUserPreferences } from "@/modules/users/data";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  // This layout guards the whole authenticated shell, and its redirect wins
  // over the page's — so the `next=` destination has to be resolved here, from
  // the header `src/middleware.ts` sets. Falling back to undefined just means a
  // bare /sign-in, which is the old behaviour.
  const pathname = (await headers()).get("x-pathname") ?? undefined;
  const user = await requireUser(pathname);
  const prefs = await findUserPreferences(user.id);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <PrimaryNav viewer={{ name: user.name || user.email, image: user.image }} />
      <div className="flex flex-1 flex-col">
        <InstallPrompt />
        {prefs ? <TimeZoneNudge profileTimeZone={prefs.timezone} /> : null}
        {/* pb-24 leaves room for the mobile bottom nav */}
        <main className="flex-1 px-5 pt-5 pb-28 md:px-12 md:pt-10 md:pb-12">{children}</main>
      </div>
    </div>
  );
}
