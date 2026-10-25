"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/session";
import { takeToken } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { SubmitFragranceInput } from "./submit-schema";
import { submitFragrance } from "./data";

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/** Submissions per user per day. Generous for real use, a brake on junk. */
const DAILY_SUBMISSIONS = 20;

/**
 * Submit a fragrance missing from the catalogue. It is created PENDING and is
 * visible only to its submitter until approved; they can add it to their
 * wardrobe straight away.
 */
export async function submitFragranceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = SubmitFragranceInput.safeParse({
    brand: formData.get("brand"),
    name: formData.get("name"),
    concentration: formData.get("concentration"),
    releaseYear: formData.get("releaseYear"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const key = String(i.path[0] ?? "form");
      fieldErrors[key] ??= i.message;
    }
    return { ok: false, fieldErrors };
  }

  const rl = takeToken(`fragrance-submit:${user.id}`, DAILY_SUBMISSIONS, 24 * 60 * 60_000);
  if (!rl.allowed) {
    logger.warn("fragrance.submit_rate_limited", { userId: user.id });
    return { ok: false, message: "You've submitted a lot today. Try again tomorrow." };
  }

  const result = await submitFragrance(user.id, parsed.data);
  if (result.kind === "pending-elsewhere") {
    return {
      ok: false,
      message: "Someone has already submitted this one. It will appear once it's reviewed.",
    };
  }
  revalidatePath("/fragrances");
  redirect(`/fragrances/${result.id}`);
}
