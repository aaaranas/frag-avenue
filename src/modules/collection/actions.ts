"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { CollectionItemFormInput, toPersistenceInput } from "./schema";
import {
  createCollectionItem,
  deleteCollectionItemForUser,
  findFragrancePreview,
  updateCollectionItemForUser,
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
    bottleSizeMl: formData.get("bottleSizeMl"),
    remainingMl: formData.get("remainingMl"),
    priceDecimal: formData.get("priceDecimal"),
    currency: formData.get("currency"),
    purchaseDate: formData.get("purchaseDate"),
    purchaseSource: formData.get("purchaseSource"),
    batchCode: formData.get("batchCode"),
    condition: formData.get("condition") ?? "NEW",
    personalRating: formData.get("personalRating"),
    personalNotes: formData.get("personalNotes"),
  };
}

export async function addToCollectionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = CollectionItemFormInput.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  const fragrance = await findFragrancePreview(parsed.data.fragranceId);
  if (!fragrance) {
    return { ok: false, message: "That fragrance no longer exists." };
  }

  await createCollectionItem(user.id, toPersistenceInput(parsed.data));
  revalidatePath("/collection");
  redirect("/collection");
}

export async function updateCollectionItemAction(
  itemId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = CollectionItemFormInput.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  const ok = await updateCollectionItemForUser(user.id, itemId, toPersistenceInput(parsed.data));
  if (!ok) {
    return { ok: false, message: "This item is no longer in your collection." };
  }
  revalidatePath("/collection");
  revalidatePath(`/collection/${itemId}/edit`);
  redirect("/collection");
}

export async function deleteCollectionItemAction(itemId: string): Promise<void> {
  const user = await requireUser();
  await deleteCollectionItemForUser(user.id, itemId);
  revalidatePath("/collection");
  redirect("/collection");
}
