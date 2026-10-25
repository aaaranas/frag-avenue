"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/session";
import { UpdateTimeZoneInput } from "./schema";
import { updateUserTimeZone } from "./data";

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

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
