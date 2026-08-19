import { test, expect } from "@playwright/test";

test("landing page loads for a signed-out visitor", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("You own the collection");
  // Signed out, the hero call to action is sign-up, not "open the app".
  await expect(page.getByRole("link", { name: /start your wardrobe/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /open the app/i })).toHaveCount(0);
});

test("the landing page routes a signed-out visitor to sign-in", async ({ page }) => {
  await page.goto("/");
  // The footer carries a second "Sign in" link, so scope to the header nav.
  await page
    .getByRole("navigation")
    .getByRole("link", { name: /^sign in$/i })
    .click();

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByLabel("Email")).toBeVisible();
});

const PROTECTED = ["/dashboard", "/collection", "/wear", "/insights", "/advisor", "/profile"];

for (const path of PROTECTED) {
  test(`unauthenticated access to ${path} is redirected to sign-in`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/sign-in/);
    // The redirect preserves where the visitor was headed.
    expect(new URL(page.url()).searchParams.get("next")).toBe(path);
  });
}
