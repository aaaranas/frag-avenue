import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { deleteWearAction } from "@/modules/wear-logs";
import { findWearForUser } from "@/modules/wear-logs/data";
import { Eyebrow } from "@/components/ui/eyebrow";
import { EditWearForm } from "./edit-wear-form";
import type { WearFieldDefaults } from "../../wear-form-fields";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Edit wear" };

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditWearPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser(`/wear/${id}/edit`);
  const wear = await findWearForUser(user.id, id);
  if (!wear) notFound();

  const defaults: WearFieldDefaults = {
    wornAt: toDatetimeLocal(wear.wornAt),
    sprays: wear.sprays.toString(),
    occasion: wear.occasion,
    environment: wear.environment,
    temperatureC: wear.temperatureC?.toString() ?? "",
    humidityPct: wear.humidityPct?.toString() ?? "",
    weatherCondition:
      (["clear", "clouds", "rain", "snow", "storm", "fog"] as const).find(
        (c) => c === wear.weatherCondition,
      ) ?? "",
    longevityHours: wear.longevityHours?.toString() ?? "",
    projection: wear.projection?.toString() ?? "",
    enjoyment: wear.enjoyment?.toString() ?? "",
    notes: wear.notes ?? "",
  };

  const deleteBound = deleteWearAction.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/wear"
        className="text-xs tracking-[0.14em] text-[color:var(--fg-faint)] uppercase hover:text-[color:var(--fg)]"
      >
        ← Wear journal
      </Link>

      <header className="mt-6 mb-10 border-b border-[color:var(--rule)] pb-6">
        <Eyebrow>{wear.fragrance.brand.name}</Eyebrow>
        <h1 className="mt-2 font-serif text-3xl leading-tight">{wear.fragrance.name}</h1>
      </header>

      <EditWearForm
        wearId={id}
        fragranceId={wear.fragranceId}
        collectionItemId={wear.collectionItemId}
        defaults={defaults}
      />

      <form action={deleteBound} className="mt-16 border-t border-[color:var(--rule)] pt-6">
        <p className="text-xs text-[color:var(--fg-muted)]">Delete this wear permanently.</p>
        <button
          type="submit"
          className="mt-3 rounded-sm border border-red-700/40 px-4 py-2 text-sm text-red-800 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          Delete wear
        </button>
      </form>
    </div>
  );
}
