import "server-only";

/** Google sign-in is offered only when its OAuth client is configured. */
export function googleEnabled(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}
