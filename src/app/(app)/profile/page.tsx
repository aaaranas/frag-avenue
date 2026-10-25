import { requireUser } from "@/modules/auth/session";
import { oauthErrorMessage, signOutAction } from "@/modules/auth";
import { findSignInMethods } from "@/modules/auth/data";
import { googleEnabled } from "@/modules/auth/google";
import { ConnectGoogleButton } from "@/components/auth/connect-google-button";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { findProfileSettings, findUserPreferences } from "@/modules/users/data";
import { ProfileForm } from "./profile-form";
import { selectableTimeZones } from "@/lib/time-zones";
import { TimeZoneForm } from "./time-zone-form";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ error?: string; connected?: string }>;

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/profile");
  const [prefs, settings, methods, params] = await Promise.all([
    findUserPreferences(user.id),
    findProfileSettings(user.id),
    findSignInMethods(user.id),
    searchParams,
  ]);
  const connectError = oauthErrorMessage(params.error, "connect");
  const timezone = prefs?.timezone ?? "UTC";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Profile"
        actions={
          settings?.username ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/u/${settings.username}`}>View your profile</Link>
            </Button>
          ) : undefined
        }
      />

      <Section
        id="details"
        title="Your details"
        description="How people see you, and your defaults."
      >
        <Panel>
          <ProfileForm
            defaults={{
              username: settings?.username ?? "",
              name: settings?.name ?? "",
              bio: settings?.bio ?? "",
              defaultVisibility: settings?.defaultVisibility ?? "FOLLOWERS",
              units: settings?.units ?? "METRIC",
            }}
          />
        </Panel>
      </Section>

      <Section id="tz" title="Time zone">
        <Panel>
          <TimeZoneForm current={timezone} zones={selectableTimeZones(timezone)} />
        </Panel>
      </Section>

      <Section id="methods" title="Sign-in methods">
        {connectError ? (
          <p role="alert" className="form-error mb-2">
            {connectError}
          </p>
        ) : null}
        {params.connected === "google" && methods.google ? (
          <p role="status" className="mb-2 text-sm">
            Google is connected.
          </p>
        ) : null}
        <Panel className="py-1">
          <dl className="flex flex-col divide-y divide-[color:var(--rule)] text-sm">
            <Row label="Email" value={user.email} />
            <Row label="Password" value={methods.password ? "Set" : "Not set"} />
            {googleEnabled() || methods.google ? (
              <Row label="Google" value={methods.google ? "Connected" : <ConnectGoogleButton />} />
            ) : null}
          </dl>
        </Panel>
      </Section>

      <form
        action={async () => {
          "use server";
          await signOutAction();
        }}
      >
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          Sign out
        </Button>
      </form>
    </div>
  );
}

/** A settings group: one surface, so related controls read as one block. */
function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)] px-4 py-5 sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid min-h-14 grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4 py-2">
      <dt className="text-[color:var(--fg-muted)]">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value}</dd>
    </div>
  );
}
