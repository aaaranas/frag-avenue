import { test, expect } from "@playwright/test";

test("landing page loads and links into the app shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("fragrance wardrobe");
  await page.getByRole("link", { name: /enter the app/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
