import { expect, test } from "@playwright/test";
import { STORAGE_STATE, addToWardrobe, signUpFreshUser } from "./helpers";

test("a first wear shows up in every stat", async ({ page }) => {
  await signUpFreshUser(page);
  const worn = await addToWardrobe(page, "Aventus");
  await addToWardrobe(page, "Layton");

  await page.goto("/stats");
  await expect(page.getByText("No wears yet")).toBeVisible();
  // Both owned bottles are untouched before anything is worn.
  await expect(page.getByRole("list", { name: "Untouched" }).getByRole("listitem")).toHaveCount(2);

  await page.goto(`/log?item=${worn}`);
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page).toHaveURL(/\/wears\/\w+$/);

  await page.goto("/stats");
  const totals = page.getByRole("region", { name: "Totals" });
  await expect(totals).toContainText("Wears1");
  await expect(totals).toContainText("Unique scents1");
  await expect(totals).toContainText("Day streak1 day");
  await expect(page.getByRole("list", { name: "Most worn" })).toContainText("Creed Aventus1 wear");
  const untouched = page.getByRole("list", { name: "Untouched" });
  await expect(untouched.getByRole("listitem")).toHaveCount(1);
  await expect(untouched).toContainText("Layton");
  await expect(untouched).toContainText("Never worn");
});

test.describe("the seeded stats", () => {
  test.use({ storageState: STORAGE_STATE });

  test("shows totals, most worn, accords, untouched, and the weather placeholder", async ({
    page,
  }) => {
    await page.goto("/stats");
    const totals = page.getByRole("region", { name: "Totals" });
    await expect(totals).toContainText("Wears30");
    await expect(totals).toContainText("Unique scents7");
    await expect(totals).toContainText(/Day streak\d+ days?/);
    await expect(page.getByRole("list", { name: "Most worn" }).getByRole("listitem")).toHaveCount(
      5,
    );
    await expect(page.getByRole("list", { name: "Accord breakdown" })).toContainText("%");
    // Tobacco Vanille: owned, last worn 96 days ago. Wishlist entries never appear.
    const untouched = page.getByRole("list", { name: "Untouched" });
    await expect(untouched).toContainText("Tobacco Vanille");
    await expect(untouched).not.toContainText("Wishlist");
    await expect(page.getByText(/of 10\s+so far/)).toBeVisible();
  });

  test("the range narrows totals, and is marked current", async ({ page }) => {
    await page.goto("/stats");
    await page
      .getByRole("navigation", { name: "Range" })
      .getByRole("link", { name: "30 days" })
      .click();
    await expect(page).toHaveURL(/range=30d$/);
    await expect(
      page.getByRole("navigation", { name: "Range" }).getByRole("link", { name: "30 days" }),
    ).toHaveAttribute("aria-current", "page");
    const wears = Number(
      (await page.getByRole("region", { name: "Totals" }).innerText()).match(/wears\s*(\d+)/i)![1],
    );
    expect(wears).toBeGreaterThan(0);
    expect(wears).toBeLessThan(30);
  });

  test("the old dashboard, Insights, and Advisor URLs land on Stats", async ({ page }) => {
    for (const path of ["/dashboard", "/insights", "/advisor"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/stats$/);
    }
  });
});
