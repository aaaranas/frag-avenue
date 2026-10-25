"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { WardrobeItemFormInput, toPersistenceInput } from "./schema";
import {
  createWardrobeItem,
  deleteWardrobeItemForUser,
  findAddableFragrance,
  updateWardrobeItemForUser,
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
    kind: formData.get("kind") ?? undefined,
    bottleSizeMl: formData.get("bottleSizeMl"),
    remainingMl: formData.get("remainingMl"),
    priceDecimal: formData.get("priceDecimal"),
    currency: formData.get("currency"),
    purchaseDate: formData.get("purchaseDate"),
    personalNotes: formData.get("personalNotes"),
  };
}

function revalidateWardrobe() {
  revalidatePath("/wardrobe");
  revalidatePath("/wear/new");
  revalidatePath("/dashboard");
}

export async function addToWardrobeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = WardrobeItemFormInput.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }
  // Only approved fragrances, or the user's own pending submissions.
  if (!(await findAddableFragrance(user.id, parsed.data.fragranceId))) {
    return { ok: false, message: "That fragrance isn't available." };
  }
  await createWardrobeItem(user.id, toPersistenceInput(parsed.data));
  revalidateWardrobe();
  redirect(`/wardrobe?type=${parsed.data.kind.toLowerCase()}`);
}

export async function updateWardrobeItemAction(
  itemId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = WardrobeItemFormInput.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }
  const ok = await updateWardrobeItemForUser(user.id, itemId, toPersistenceInput(parsed.data));
  if (!ok) return { ok: false, message: "This item is no longer in your wardrobe." };
  revalidateWardrobe();
  revalidatePath(`/wardrobe/${itemId}`);
  redirect("/wardrobe");
}

export async function deleteWardrobeItemAction(itemId: string): Promise<void> {
  const user = await requireUser();
  await deleteWardrobeItemForUser(user.id, itemId);
  revalidateWardrobe();
  redirect("/wardrobe");
}
