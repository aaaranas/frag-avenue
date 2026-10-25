import { test, expect } from "@playwright/test";

test("the root URL sends a signed-out visitor to sign-in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frag Avenue");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("sign-in and sign-up link to each other", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frag Avenue");
  await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

const PROTECTED = [
  "/feed",
  "/wardrobe",
  "/log",
  "/stats",
  "/clubs",
  "/wardrobe/some-item",
  "/fragrances",
  "/fragrances/new",
  "/wears",
  "/wears/some-wear",
  "/advisor",
  "/profile",
];

for (const path of PROTECTED) {
  test(`unauthenticated access to ${path} is redirected to sign-in`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/sign-in/);
    // The redirect preserves where the visitor was headed.
    expect(new URL(page.url()).searchParams.get("next")).toBe(path);
  });
}
