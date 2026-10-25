import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";

// Wardrobe tab. Forwards to the legacy collection until Phase 3 replaces it.
export default async function WardrobePage(): Promise<never> {
  // Authenticate before forwarding, so a signed-out visitor is sent to sign-in
  // with next=/wardrobe, not with the legacy destination.
  await requireUser("/wardrobe");
  redirect("/collection");
}
