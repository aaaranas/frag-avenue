import { expect, test } from "@playwright/test";
import { addToWardrobe, signUpFreshUser } from "./helpers";

// Deleting asks first; Cancel changes nothing.

test("removing a wardrobe item asks first, and Cancel keeps it", async ({ page }) => {
  await signUpFreshUser(page);
  const itemId = await addToWardrobe(page, "Layton");

  await page.goto(`/wardrobe/${itemId}`);
  await page.getByRole("button", { name: "Remove from wardrobe" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Remove Layton?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  // Focus returns to the button that opened it.
  await expect(page.getByRole("button", { name: "Remove from wardrobe" })).toBeFocused();

  await page.getByRole("button", { name: "Remove from wardrobe" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(page).toHaveURL(/\/wardrobe(\?|$)/);
  await page.goto(`/wardrobe/${itemId}`);
  await expect(page.getByText("Not in your wardrobe")).toBeVisible();
});

test("deleting a wear asks first", async ({ page }) => {
  await signUpFreshUser(page);
  const itemId = await addToWardrobe(page, "Aventus");
  await page.goto(`/log?item=${itemId}`);
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page).toHaveURL(/\/wears\/\w+$/);
  const wearUrl = page.url();

  await page.getByRole("button", { name: "Delete wear" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete this wear?" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(wearUrl);

  await page.getByRole("button", { name: "Delete wear" }).click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page).not.toHaveURL(wearUrl);
  await page.goto(wearUrl);
  await expect(page.getByText("Wear not found")).toBeVisible();
});
