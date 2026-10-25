import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { deleteWearAction } from "@/modules/wear-logs";
import { findWearForUser } from "@/modules/wear-logs/data";
import { Eyebrow } from "@/components/ui/eyebrow";
import { wallTime } from "@/lib/time-zone";
import { EditWearForm } from "./edit-wear-form";
import type { WearFieldDefaults } from "../../wear-form-fields";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Edit wear" };

export default async function EditWearPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser(`/wear/${id}/edit`);
  const wear = await findWearForUser(user.id, id);
  if (!wear) notFound();

  const defaults: WearFieldDefaults = {
    // Shown in the zone the wear was logged in; the update action reads it back in the same zone.
    wornAt: wallTime(wear.wornAt, wear.timeZone),
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
        className="inline-flex min-h-11 items-center text-xs tracking-[0.14em] text-[color:var(--fg-faint)] uppercase hover:text-[color:var(--fg)]"
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
          className="mt-3 min-h-11 rounded-sm border border-[color:var(--fg)] px-4 text-sm font-medium text-[color:var(--fg)] hover:bg-[color:var(--bg-sunken)]"
        >
          Delete wear
        </button>
      </form>
    </div>
  );
}
