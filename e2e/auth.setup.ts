import { test as setup, expect } from "@playwright/test";
import { SEEDED_USER, STORAGE_STATE, signIn } from "./helpers";

/**
 * Signs in as the seeded account once per run and saves the session, so the
 * read-only specs can reuse it via `storageState`.
 *
 * Signing in per test also worked, but it drove a real credentials sign-in for
 * every one of them and — across two browser projects from one IP — walked
 * straight into the auth rate limiter. Doing it once is both faster and a more
 * honest test of the app, since nothing about those specs is about signing in.
 */
setup("authenticate as the seeded dev user", async ({ page }) => {
  await signIn(page, SEEDED_USER.email, SEEDED_USER.password);

  // Prove the session really carries data before freezing it, otherwise every
  // dependent spec fails with a confusing "not signed in".
  await page.goto("/collection");
  await expect(page.getByRole("button", { name: /Creed Aventus/ })).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
