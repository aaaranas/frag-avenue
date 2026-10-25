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
        eyebrow="Account"
        title="Profile"
        actions={
          settings?.username ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/u/${settings.username}`}>View your profile</Link>
            </Button>
          ) : undefined
        }
      />

      <ProfileForm
        defaults={{
          username: settings?.username ?? "",
          name: settings?.name ?? "",
          bio: settings?.bio ?? "",
          defaultVisibility: settings?.defaultVisibility ?? "FOLLOWERS",
          units: settings?.units ?? "METRIC",
        }}
      />

      <section
        aria-labelledby="tz-heading"
        className="mt-10 border-t border-[color:var(--rule)] pt-8"
      >
        <h2 id="tz-heading" className="mb-4 text-lg font-semibold">
          Time zone
        </h2>
        <TimeZoneForm current={timezone} zones={selectableTimeZones(timezone)} />
      </section>

      <section
        aria-labelledby="methods-heading"
        className="mt-10 border-t border-[color:var(--rule)] pt-8"
      >
        <h2 id="methods-heading" className="mb-2 text-lg font-semibold">
          Sign-in methods
        </h2>
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
        <dl className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)] text-sm">
          <Row label="Email" value={user.email} />
          <Row label="Password" value={methods.password ? "Set" : "Not set"} />
          {googleEnabled() || methods.google ? (
            <Row label="Google" value={methods.google ? "Connected" : <ConnectGoogleButton />} />
          ) : null}
        </dl>
      </section>

      <form
        action={async () => {
          "use server";
          await signOutAction();
        }}
        className="mt-10"
      >
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-6 py-3">
      <dt className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
