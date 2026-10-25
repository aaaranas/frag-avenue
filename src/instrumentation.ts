/**
 * Runs once when a server instance starts. Validates the environment so a
 * misconfigured deploy fails at boot with a readable list of problems, instead
 * of on the first request that happens to touch a missing variable.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env } = await import("./lib/env");
  env();
}
