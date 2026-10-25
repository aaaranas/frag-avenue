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
  // The browser's zone is filled in after hydration; wait for it so the account
  // gets the context's zone rather than the UTC fallback.
  await expect(page.locator('input[name="timezone"]')).not.toHaveValue("");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: /create account/i }).click();
  // /feed forwards to the legacy dashboard until the feed ships.
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}

/** Adds a catalogue fragrance to the signed-in user's wardrobe. Returns the item id. */
export async function addToWardrobe(
  page: Page,
  search: string,
  opts: { kind?: "Bottle" | "Decant" | "Sample" | "Wishlist"; sizeMl?: string } = {},
): Promise<string> {
  await page.goto(`/fragrances?q=${encodeURIComponent(search)}`);
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("link", { name: new RegExp(search, "i") })
    .first()
    .click();
  await expect(page).toHaveURL(/\/fragrances\/\w+$/);
  await page.getByRole("radio", { name: new RegExp(`^${opts.kind ?? "Bottle"}`) }).check();
  if (opts.sizeMl ?? opts.kind !== "Wishlist") {
    await page.getByLabel(/^Size, ml/).fill(opts.sizeMl ?? "100");
  }
  await page.getByRole("button", { name: "Add to wardrobe" }).click();
  await expect(page).toHaveURL(/\/wardrobe\?type=/);
  const edit = page.getByRole("link", { name: new RegExp(`^Edit .*${search}`, "i") }).first();
  const href = await edit.getAttribute("href");
  return href!.split("/").pop()!;
}

/** "YYYY-MM-DDTHH:mm" for `msAgo` before now, in `timeZone` — a datetime-local value. */
export function wallTimeAgo(msAgo: number, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(Date.now() - msAgo))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
