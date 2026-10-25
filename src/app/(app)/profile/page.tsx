import { requireUser } from "@/modules/auth/session";
import { signOutAction } from "@/modules/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { findUserPreferences } from "@/modules/users/data";
import { selectableTimeZones } from "@/lib/time-zones";
import { TimeZoneForm } from "./time-zone-form";

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const prefs = await findUserPreferences(user.id);
  const timezone = prefs?.timezone ?? "UTC";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Account" title="Profile" />

      <dl className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)] text-sm">
        <Row label="Email" value={user.email} />
        {user.name ? <Row label="Name" value={user.name} /> : null}
        <Row label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
      </dl>

      <section aria-labelledby="prefs-heading" className="mt-10">
        <h2 id="prefs-heading" className="eyebrow mb-4">
          Preferences
        </h2>
        <TimeZoneForm current={timezone} zones={selectableTimeZones(timezone)} />
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
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-6 py-4">
      <dt className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
