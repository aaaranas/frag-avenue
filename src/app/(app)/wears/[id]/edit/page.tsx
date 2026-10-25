import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { findWearForUser } from "@/modules/wear-logs/data";
import {
  MAX_SPRAYS,
  MIN_SPRAYS,
  OCCASIONS,
  updateWearAction,
  type Occasion,
} from "@/modules/wear-logs";
import { wallTime } from "@/lib/time-zone";
import { EditWearForm } from "./edit-wear-form";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Edit wear" };

export default async function EditWearPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser(`/wears/${id}/edit`);
  const wear = await findWearForUser(user.id, id);
  if (!wear) notFound();

  const occasion = (OCCASIONS as readonly string[]).includes(wear.occasion)
    ? (wear.occasion as Occasion)
    : "OTHER";

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={`/wears/${wear.id}`}
        className="inline-flex min-h-11 items-center text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
      >
        ← Back to wear
      </Link>
      <p className="label-caps mt-2">{wear.fragrance.brand.name}</p>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Edit {wear.fragrance.name}</h1>
      <EditWearForm
        action={updateWearAction.bind(null, wear.id)}
        defaults={{
          // Shown in the zone the wear was logged in; saved back in the same zone.
          wornAt: wallTime(wear.wornAt, wear.timeZone),
          // Older wears allowed up to 20 sprays; the form starts in range.
          sprays: Math.min(MAX_SPRAYS, Math.max(MIN_SPRAYS, wear.sprays)),
          occasion,
          mood: wear.mood ?? "",
          notes: wear.notes ?? "",
          visibility: wear.visibility,
        }}
      />
    </div>
  );
}
