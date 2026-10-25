"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { WearFormInput, toPersistenceInput } from "./schema";
import {
  createWearForUser,
  deleteWearForUser,
  findCollectionItemOwnedByUser,
  findUserTimeZone,
  findWearTimeZoneForUser,
  fragranceExists,
  updateWearForUser,
} from "./data";

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function collectFieldErrors(issues: readonly { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    if (!out[key]) out[key] = i.message;
  }
  return out;
}

function readForm(formData: FormData) {
  return {
    fragranceId: formData.get("fragranceId"),
    collectionItemId: formData.get("collectionItemId"),
    wornAt: formData.get("wornAt"),
    sprays: formData.get("sprays"),
    occasion: formData.get("occasion") ?? "CASUAL",
    environment: formData.get("environment") ?? "MIXED",
    temperatureC: formData.get("temperatureC"),
    humidityPct: formData.get("humidityPct"),
    weatherCondition: formData.get("weatherCondition"),
    longevityHours: formData.get("longevityHours"),
    projection: formData.get("projection"),
    enjoyment: formData.get("enjoyment"),
    notes: formData.get("notes"),
  };
}

export async function logWearAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = WearFormInput.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  // Authorization: if a collectionItemId is supplied, it must belong to this
  // user, and its fragranceId overrides the client-supplied one. Otherwise the
  // wear is a sample/borrow — verify the fragrance exists (FK safety).
  let fragranceId = parsed.data.fragranceId;
  const collectionItemId = parsed.data.collectionItemId ?? null;

  if (collectionItemId) {
    const owned = await findCollectionItemOwnedByUser(user.id, collectionItemId);
    if (!owned) {
      return { ok: false, message: "That bottle is not in your collection." };
    }
    fragranceId = owned.fragranceId;
  } else {
    const exists = await fragranceExists(user.id, fragranceId);
    if (!exists) {
      return { ok: false, message: "That fragrance no longer exists." };
    }
  }

  // New wears are logged in the user's current zone (server-side, so the
  // stored zone always matches the one the form's default time was shown in).
  const timeZone = await findUserTimeZone(user.id);
  const persistence = toPersistenceInput(
    { ...parsed.data, fragranceId, collectionItemId: collectionItemId ?? undefined },
    timeZone,
  );
  await createWearForUser(user.id, persistence);
  revalidatePath("/wear");
  revalidatePath("/dashboard");
  redirect("/wear");
}

export async function updateWearAction(
  wearId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = WearFormInput.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  // An edited time is read in the zone the wear was logged in — the zone the
  // edit form displayed it in — not the user's current zone.
  const timeZone = await findWearTimeZoneForUser(user.id, wearId);
  if (!timeZone) {
    return { ok: false, message: "This wear is no longer available." };
  }
  const persistence = toPersistenceInput(parsed.data, timeZone);
  const ok = await updateWearForUser(user.id, wearId, persistence);
  if (!ok) {
    return { ok: false, message: "This wear is no longer available." };
  }
  revalidatePath("/wear");
  revalidatePath(`/wear/${wearId}/edit`);
  revalidatePath("/dashboard");
  redirect("/wear");
}

export async function deleteWearAction(wearId: string): Promise<void> {
  const user = await requireUser();
  await deleteWearForUser(user.id, wearId);
  revalidatePath("/wear");
  revalidatePath("/dashboard");
  redirect("/wear");
}
