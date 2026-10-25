"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { getWeatherService } from "@/modules/weather/service";
import { CheckInInput, EditWearInput, LogWearInput, isInFuture, toWearFields } from "./schema";
import { dueCheckIn } from "./check-ins";
import {
  createCheckIn,
  createWear,
  deleteWearForUser,
  findLogDefaults,
  findWearForCheckIn,
  findWearTimeZoneForUser,
  findWearableItem,
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
    out[key] ??= i.message;
  }
  return out;
}

const field = (formData: FormData, name: string) => formData.get(name) ?? undefined;

function readWearFields(formData: FormData) {
  return {
    wornAt: field(formData, "wornAt"),
    sprays: field(formData, "sprays"),
    occasion: field(formData, "occasion"),
    mood: field(formData, "mood"),
    notes: field(formData, "notes"),
    visibility: field(formData, "visibility"),
  };
}

function revalidateWears() {
  // Wear counts, cost per wear, and check-in prompts appear across the app.
  revalidatePath("/", "layout");
}

/**
 * Log a wear of one of the user's own (non-wishlist) items. The wear is logged
 * in the user's zone; weather for its time is attached when the browser sent a
 * location, and the location itself is not stored.
 */
export async function logWearAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = LogWearInput.safeParse({
    itemId: field(formData, "itemId"),
    ...readWearFields(formData),
    lat: field(formData, "lat"),
    lon: field(formData, "lon"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };

  const item = await findWearableItem(user.id, parsed.data.itemId);
  if (!item) return { ok: false, message: "That item isn't in your wardrobe." };

  const { timezone } = await findLogDefaults(user.id);
  const fields = toWearFields(parsed.data, timezone);
  if (isInFuture(fields.wornAt, new Date())) {
    return { ok: false, fieldErrors: { wornAt: "That's in the future." } };
  }

  const { lat, lon } = parsed.data;
  const weather =
    lat !== undefined && lon !== undefined
      ? await getWeatherService().snapshot({ lat, lon }, fields.wornAt)
      : null;

  const wear = await createWear(user.id, {
    ...fields,
    fragranceId: item.fragranceId,
    collectionItemId: item.id,
    timeZone: timezone,
    weather,
  });
  revalidateWears();
  redirect(`/wears/${wear.id}`);
}

export async function updateWearAction(
  wearId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = EditWearInput.safeParse(readWearFields(formData));
  if (!parsed.success) return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };

  // Read the edited time in the zone the wear was logged in — the zone the
  // form displayed it in — not the user's current zone.
  const timeZone = await findWearTimeZoneForUser(user.id, wearId);
  if (!timeZone) return { ok: false, message: "This wear is no longer available." };

  const fields = toWearFields(parsed.data, timeZone);
  if (isInFuture(fields.wornAt, new Date())) {
    return { ok: false, fieldErrors: { wornAt: "That's in the future." } };
  }
  if (!(await updateWearForUser(user.id, wearId, fields))) {
    return { ok: false, message: "This wear is no longer available." };
  }
  revalidateWears();
  redirect(`/wears/${wearId}`);
}

export async function deleteWearAction(wearId: string): Promise<void> {
  const user = await requireUser();
  await deleteWearForUser(user.id, wearId);
  revalidateWears();
  redirect("/wears");
}

/**
 * Answer a check-in prompt. Accepted only for the user's own wear and only
 * while that prompt is open (see `dueCheckIn`): late, early, repeated, and
 * after-"Gone" answers are ignored. Plain form post, so it works without JS.
 */
export async function recordCheckInAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = CheckInInput.safeParse({
    wearId: formData.get("wearId"),
    offsetHours: formData.get("offsetHours"),
    result: formData.get("result"),
  });
  if (!parsed.success) return;

  const wear = await findWearForCheckIn(user.id, parsed.data.wearId);
  if (!wear) return;
  if (dueCheckIn(wear.wornAt, wear.checkIns, new Date()) !== parsed.data.offsetHours) return;

  await createCheckIn(user.id, wear.id, parsed.data.offsetHours, parsed.data.result);
  revalidateWears();
}
