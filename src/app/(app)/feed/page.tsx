import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";

// Feed tab. Until the feed ships (Phase 5) it forwards to the legacy dashboard,
// so the tab, the PWA start URL, and post-sign-in landing already use /feed.
export default async function FeedPage(): Promise<never> {
  // Authenticate before forwarding, so a signed-out visitor is sent to sign-in
  // with next=/feed, not with the legacy destination.
  await requireUser("/feed");
  redirect("/dashboard");
}
