import { requireUser } from "@/modules/auth/session";
import { signOutAction } from "@/modules/auth";
import { PageHeader } from "@/components/ui/page-header";

export default async function ProfilePage() {
  const user = await requireUser("/profile");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Account" title="Profile" />

      <dl className="flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)] text-sm">
        <Row label="Email" value={user.email} />
        {user.name ? <Row label="Name" value={user.name} /> : null}
        <Row label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
      </dl>

      <form
        action={async () => {
          "use server";
          await signOutAction();
        }}
        className="mt-10"
      >
        <button
          type="submit"
          className="rounded-sm border border-[color:var(--rule-strong)] px-4 py-2 text-sm hover:bg-[color:var(--bg-elev)]"
        >
          Sign out
        </button>
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
