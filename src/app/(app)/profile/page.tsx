import { requireUser } from "@/modules/auth/session";
import { signOutAction } from "@/modules/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { findProfileSettings, findUserPreferences } from "@/modules/users/data";
import { ProfileForm } from "./profile-form";
import { selectableTimeZones } from "@/lib/time-zones";
import { TimeZoneForm } from "./time-zone-form";

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const [prefs, settings] = await Promise.all([
    findUserPreferences(user.id),
    findProfileSettings(user.id),
  ]);
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

      <dl className="mt-10 flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)] text-sm">
        <Row label="Email" value={user.email} />
      </dl>

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
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-6 py-4">
      <dt className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
