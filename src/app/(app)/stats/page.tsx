import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";

// Stats tab. Forwards to the legacy insights page until Phase 6 replaces it.
export default async function StatsPage(): Promise<never> {
  // Authenticate before forwarding, so a signed-out visitor is sent to sign-in
  // with next=/stats, not with the legacy destination.
  await requireUser("/stats");
  redirect("/insights");
}
