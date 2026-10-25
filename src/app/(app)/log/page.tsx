import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/modules/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Only the parameters the legacy log page understands are forwarded.
const Forwarded = z.object({
  collectionItemId: z.string().min(1).max(64).optional().catch(undefined),
  fragranceId: z.string().min(1).max(64).optional().catch(undefined),
});

// Log tab (centre "+"). Forwards to the legacy log form until Phase 4 replaces it.
export default async function LogPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser("/log");
  const params = Forwarded.parse(await searchParams);
  const query = new URLSearchParams();
  if (params.collectionItemId) query.set("collectionItemId", params.collectionItemId);
  if (params.fragranceId) query.set("fragranceId", params.fragranceId);
  const qs = query.toString();
  redirect(qs ? `/wear/new?${qs}` : "/wear/new");
}
