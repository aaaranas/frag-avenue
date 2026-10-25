"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/session";
import { ProfileInput, UpdateTimeZoneInput, UsernameInput } from "./schema";
import { updateProfile, updateUserTimeZone } from "./data";

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function fieldErrors(issues: readonly { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}

/**
 * Set the signed-in user's time zone. It decides what "today" is for streaks
 * and is snapshotted onto each new wear; existing wears keep their own zone.
 */
export async function updateTimeZoneAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = UpdateTimeZoneInput.safeParse({ timezone: formData.get("timezone") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: { timezone: parsed.error.issues[0]!.message } };
  }
  await updateUserTimeZone(user.id, parsed.data.timezone);
  // The zone shapes rendering across the whole shell (defaults, dates, banner).
  revalidatePath("/", "layout");
  return { ok: true, message: `Time zone set to ${parsed.data.timezone}.` };
}

/** Save profile settings: username, name, bio, default visibility, units. */
export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = ProfileInput.safeParse({
    username: formData.get("username"),
    name: formData.get("name"),
    bio: formData.get("bio"),
    defaultVisibility: formData.get("defaultVisibility"),
    units: formData.get("units"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error.issues) };

  const result = await updateProfile(user.id, {
    ...parsed.data,
    name: parsed.data.name ?? null,
    bio: parsed.data.bio ?? null,
  });
  if (result === "taken")
    return { ok: false, fieldErrors: { username: "That username is taken." } };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

/** Just claim a username (the prompt shown to accounts created before usernames). */
export async function setUsernameAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = UsernameInput.safeParse({ username: formData.get("username") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error.issues) };
  if ((await updateProfile(user.id, parsed.data)) === "taken") {
    return { ok: false, fieldErrors: { username: "That username is taken." } };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
