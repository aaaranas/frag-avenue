import { test, expect } from "@playwright/test";

/**
 * Golden path: sign up → browse → add fragrance → log wear → dashboard
 * reflects → advisor returns something.
 *
 * Requires a running Postgres and a seeded database:
 *   pnpm db:up && pnpm db:migrate && pnpm db:seed
 * Then Playwright's `webServer` config starts `pnpm start` on demand.
 */
test("golden path: sign up, add a fragrance, log a wear, dashboard + advisor reflect", async ({
  page,
}) => {
  const email = `e2e+${Date.now()}@frag.avenue`;
  const password = "test-password-123";

  // --- Sign up ---
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // --- Add a bottle to collection ---
  await page.goto("/fragrances");
  await page
    .getByRole("link", { name: /aventus/i })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /aventus/i })).toBeVisible();
  await page.getByLabel(/bottle size/i).fill("100");
  await page.getByRole("button", { name: /save to my collection/i }).click();
  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.getByRole("link", { name: /aventus/i })).toBeVisible();

  // --- Log a wear from the collection item ---
  await page
    .getByRole("link", { name: /log wear/i })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /log a wear/i })).toBeVisible();
  await page.getByLabel(/sprays/i).fill("6");
  await page.getByRole("button", { name: /^log wear$/i }).click();
  await expect(page).toHaveURL(/\/wear$/);
  await expect(page.getByText(/aventus/i).first()).toBeVisible();
  await expect(page.getByText(/6 sprays/i)).toBeVisible();

  // --- Dashboard reflects ---
  await page.goto("/dashboard");
  await expect(page.getByText(/fragrances owned/i)).toBeVisible();
  // "1" appears in the fragrances-owned stat and the total-wears stat
  await expect(page.getByText(/total wears/i)).toBeVisible();

  // --- Advisor returns at least the bottle we own ---
  await page.goto("/advisor");
  await expect(page.getByRole("heading", { name: /what should i wear/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /aventus/i })).toBeVisible();
});

test("unauthenticated users are redirected to sign-in from protected routes", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});
