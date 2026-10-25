import path from "node:path";
import { expect, type Page } from "@playwright/test";

/** Where `auth.setup.ts` parks the seeded account's session. Gitignored. */
export const STORAGE_STATE = path.join(import.meta.dirname, ".auth", "seeded-user.json");

/**
 * The account `pnpm db:seed` creates. Mirrors DEV_USER in prisma/seed.ts.
 *
 * Tests that only READ may use it. Anything that writes must sign up its own
 * account instead — the suite runs fully parallel against one database, and a
 * shared mutable account would make wear counts and collection sizes racy.
 */
export const SEEDED_USER = {
  email: "dev@frag.test",
  password: "devpassword123",
} as const;

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // /feed forwards to the legacy dashboard until the feed ships.
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Signs up a fresh, unique account. Returns its email. */
export async function signUpFreshUser(page: Page): Promise<string> {
  // Unique per test AND per worker, so parallel workers cannot collide.
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@frag.test`;
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: /create account/i }).click();
  // /feed forwards to the legacy dashboard until the feed ships.
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}
