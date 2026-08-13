import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client-IP extraction from proxy headers. Returns "unknown" when
 * no header is present (e.g., direct `pnpm start` locally). The value is used
 * only as a rate-limit key — do NOT rely on it for authorization.
 */
export async function requestIp(): Promise<string> {
  const h = await headers();
  const xf = h.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
