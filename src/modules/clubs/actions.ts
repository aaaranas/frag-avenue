"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { takeToken } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { ClubRef, CreateClubInput } from "./schema";
import { createClub, findClubForMembership, joinClub, leaveClub } from "./data";

export type FormState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };

/** Clubs a user may create per day. */
const DAILY_CLUBS = 5;

export async function createClubAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = CreateClubInput.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, fieldErrors };
  }
  const rl = takeToken(`club-create:${user.id}`, DAILY_CLUBS, 24 * 60 * 60_000);
  if (!rl.allowed) {
    logger.warn("clubs.create_rate_limited", { userId: user.id });
    return { ok: false, message: "You've started several clubs today. Try again tomorrow." };
  }
  const result = await createClub(user.id, parsed.data);
  if (result === "taken")
    return { ok: false, fieldErrors: { name: "A club with that name exists." } };
  revalidatePath("/clubs");
  redirect(`/clubs/${result.slug}`);
}

export async function joinClubAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = ClubRef.safeParse({ clubId: formData.get("clubId") });
  if (!parsed.success) return;
  if (!(await findClubForMembership(parsed.data.clubId))) return;
  await joinClub(user.id, parsed.data.clubId);
  revalidatePath("/clubs", "layout");
}

export async function leaveClubAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = ClubRef.safeParse({ clubId: formData.get("clubId") });
  if (!parsed.success) return;
  await leaveClub(user.id, parsed.data.clubId);
  revalidatePath("/clubs", "layout");
}
