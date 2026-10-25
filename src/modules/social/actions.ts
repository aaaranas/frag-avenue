"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/session";
import { takeToken } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { CommentInput, CommentRef, UserRef, WearRef } from "./schema";
import {
  createComment,
  deleteComment,
  findFollowable,
  findWearForInteraction,
  follow,
  toggleKudos,
  unfollow,
} from "./data";

export type FormState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };

const MINUTE = 60_000;

/** Per-user budget for a social write; logs and returns false when exhausted. */
function allowed(kind: string, userId: string, limit: number, windowMs: number): boolean {
  const rl = takeToken(`${kind}:${userId}`, limit, windowMs);
  if (!rl.allowed) logger.warn(`social.${kind}_rate_limited`, { userId });
  return rl.allowed;
}

function revalidateSocial() {
  revalidatePath("/", "layout");
}

/**
 * Give or take back kudos on a wear the viewer can see. Not on your own wears.
 * Plain form post: works without JavaScript; the client adds optimism.
 */
export async function toggleKudosAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = WearRef.safeParse({ wearId: formData.get("wearId") });
  if (!parsed.success) return;
  if (!allowed("kudos", user.id, 120, 60 * MINUTE)) return;

  const wear = await findWearForInteraction(user.id, parsed.data.wearId);
  if (!wear || wear.userId === user.id) return;
  await toggleKudos(user.id, wear.id);
  revalidateSocial();
}

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = CommentInput.safeParse({
    wearId: formData.get("wearId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: { body: parsed.error.issues[0]!.message } };
  }
  if (!allowed("comment", user.id, 20, 10 * MINUTE)) {
    return { ok: false, message: "You're commenting very fast. Try again in a few minutes." };
  }
  const wear = await findWearForInteraction(user.id, parsed.data.wearId);
  if (!wear) return { ok: false, message: "This wear isn't available." };
  await createComment(user.id, wear.id, parsed.data.body);
  revalidateSocial();
  return { ok: true };
}

/** Delete a comment you wrote, or any comment on your own wear. */
export async function deleteCommentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = CommentRef.safeParse({ commentId: formData.get("commentId") });
  if (!parsed.success) return;
  if (await deleteComment(user.id, parsed.data.commentId)) revalidateSocial();
}

export async function followAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = UserRef.safeParse({ userId: formData.get("userId") });
  if (!parsed.success || parsed.data.userId === user.id) return;
  if (!allowed("follow", user.id, 60, 60 * MINUTE)) return;
  if (!(await findFollowable(parsed.data.userId))) return;
  await follow(user.id, parsed.data.userId);
  revalidateSocial();
}

export async function unfollowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = UserRef.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;
  await unfollow(user.id, parsed.data.userId);
  revalidateSocial();
}
