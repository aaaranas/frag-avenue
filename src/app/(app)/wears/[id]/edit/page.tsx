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
import { BackLink } from "@/components/ui/back-link";

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
      <BackLink href={`/wears/${wear.id}`}>Back to wear</BackLink>
      <h1 className="mt-2 text-[1.625rem] leading-tight font-semibold tracking-tight font-stretch-semi-condensed">
        Edit {wear.fragrance.name}
      </h1>
      <p className="mb-8 text-sm text-[color:var(--fg-muted)]">{wear.fragrance.brand.name}</p>
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
