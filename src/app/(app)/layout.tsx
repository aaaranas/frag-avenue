import { headers } from "next/headers";
import { PrimaryNav } from "@/components/shell/primary-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { requireUser } from "@/modules/auth/session";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  // This layout guards the whole authenticated shell, and its redirect wins
  // over the page's — so the `next=` destination has to be resolved here, from
  // the header `src/middleware.ts` sets. Falling back to undefined just means a
  // bare /sign-in, which is the old behaviour.
  const pathname = (await headers()).get("x-pathname") ?? undefined;
  await requireUser(pathname);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <PrimaryNav />
      <div className="flex flex-1 flex-col">
        <InstallPrompt />
        {/* pb-24 leaves room for the mobile bottom nav */}
        <main className="flex-1 px-5 pt-8 pb-24 md:px-12 md:pt-12 md:pb-12">{children}</main>
      </div>
    </div>
  );
}
