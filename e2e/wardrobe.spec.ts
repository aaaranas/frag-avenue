import { expect, test, type Page } from "@playwright/test";
import { STORAGE_STATE, signUpFreshUser } from "./helpers";

/**
 * Requires a running Postgres and a seeded database:
 *   pnpm db:up && pnpm db:migrate && pnpm db:seed
 * Playwright's `webServer` config then starts `pnpm start` on demand.
 */

/** Opens a catalogue entry by searching for it. */
async function openFragrance(page: Page, query: string, linkName: RegExp) {
  await page.goto(`/fragrances?q=${encodeURIComponent(query)}`);
  // The results stream in behind Suspense; wait for hydration before clicking
  // (see the note in the old golden path: an early click is swallowed).
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: linkName }).first().click();
  await expect(page).toHaveURL(/\/fragrances\/\w+$/);
}

test("golden path: add a bottle, log a wear, and see wear count and cost per wear update", async ({
  page,
}) => {
  await signUpFreshUser(page);

  await openFragrance(page, "Aventus", /Aventus.*Creed/);
  await page.getByRole("radio", { name: /^Bottle/ }).check();
  await page.getByLabel("Size, ml").fill("100");
  await page.getByLabel("Left, ml").fill("80");
  await page.getByLabel("Price paid").fill("10000");
  await page.getByLabel("Currency").fill("PHP");
  await page.getByRole("button", { name: "Add to wardrobe" }).click();

  await expect(page).toHaveURL(/\/wardrobe\?type=bottle$/);
  const card = page.getByRole("listitem").filter({ hasText: "Aventus" });
  await expect(card).toContainText("100 ml bottle");
  await expect(card).toContainText("80% full");
  await expect(card).toContainText("₱10,000.00");
  await expect(card).toContainText("— (0 wears)");

  await card.getByRole("link", { name: "Log a wear of Creed Aventus" }).click();
  await expect(page).toHaveURL(/\/log\?item=/);
  await page.getByLabel("Sprays").fill("3");
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page).toHaveURL(/\/wears\/\w+$/);

  await page.goto("/wardrobe");
  const after = page.getByRole("listitem").filter({ hasText: "Aventus" });
  // One wear: cost per wear is the whole price.
  await expect(after).toContainText("₱10,000.00 (1 wear)");

  // Legacy screens still reflect it.
  await page.goto("/stats");
  await expect(page.getByRole("region", { name: "Totals" })).toContainText("1");
});

test("a wishlist entry needs no size, has no fill level, and cannot be worn", async ({ page }) => {
  await signUpFreshUser(page);

  await openFragrance(page, "Layton", /Layton/);
  await page.getByRole("radio", { name: /^Wishlist/ }).check();
  await expect(page.getByLabel("Left, ml")).toHaveCount(0);
  await page.getByLabel("Expected price").fill("16500");
  await page.getByLabel("Currency").fill("PHP");
  await page.getByRole("button", { name: "Add to wardrobe" }).click();

  await expect(page).toHaveURL(/\/wardrobe\?type=wishlist$/);
  const card = page.getByRole("listitem").filter({ hasText: "Layton" });
  await expect(card).toContainText("Wishlist");
  await expect(card).toContainText("Expected");
  await expect(card).not.toContainText("Cost per wear");
  await expect(card.getByRole("link", { name: /^Log a wear/ })).toHaveCount(0);

  // Nor does it appear in the log picker.
  await page.goto("/log");
  await expect(page.getByText("Nothing to wear yet")).toBeVisible();
});

test("an owned item needs a size", async ({ page }) => {
  await signUpFreshUser(page);
  await openFragrance(page, "Sauvage", /Sauvage/);
  await page.getByRole("radio", { name: /^Sample/ }).check();
  await page.getByRole("button", { name: "Add to wardrobe" }).click();
  await expect(page.getByText("Enter the size in ml.")).toBeVisible();
  await expect(page).toHaveURL(/\/fragrances\/\w+$/);
});

test("a submitted fragrance is visible only to its submitter until reviewed", async ({
  page,
  browser,
}) => {
  const author = await signUpFreshUser(page);
  const house = `E2E House ${Date.now()}`;

  await page.goto("/fragrances/new");
  await page.getByLabel("House").fill(house);
  await page.getByLabel("Name").fill("Test Scent");
  await page.getByLabel("Concentration").selectOption("EDP");
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page).toHaveURL(/\/fragrances\/\w+$/);
  await expect(page.getByText(/pending review/i)).toBeVisible();
  const pendingUrl = page.url();

  // The submitter can add it straight away.
  await page.getByLabel("Size, ml").fill("2");
  await page.getByRole("radio", { name: /^Sample/ }).check();
  await page.getByRole("button", { name: "Add to wardrobe" }).click();
  const item = page.getByRole("listitem").filter({ hasText: "Test Scent" });
  await expect(item).toContainText("Pending review");
  // Its page is open to the submitter, so the name links there…
  await expect(item.getByRole("link", { name: /^Test Scent/ })).toBeVisible();

  // …and a wear of it can be shared.
  await item.getByRole("link", { name: /^Log a wear of/ }).click();
  await page.getByRole("radio", { name: /^Everyone/ }).check();
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page).toHaveURL(/\/wears\/\w+$/);

  // Another user sees nothing: not in search, and not by URL.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signUpFreshUser(otherPage);
  await otherPage.goto(`/fragrances?q=${encodeURIComponent(house)}`);
  // Scoped to main: while the page streams, a hidden copy can exist briefly.
  await expect(otherPage.getByRole("main").getByText("No matches", { exact: true })).toBeVisible();
  await otherPage.goto(pendingUrl);
  await expect(otherPage.getByText("Not in the catalogue")).toBeVisible();
  // They see the shared wear, with no link to the page they can't open.
  await otherPage.goto(`/u/${author.username}`);
  const wear = otherPage.getByRole("article").filter({ hasText: "Test Scent" });
  await expect(wear).toBeVisible();
  await expect(wear.getByRole("link", { name: /^Test Scent/ })).toHaveCount(0);
  await other.close();
});

test("a fresh account sees empty states rather than errors", async ({ page }) => {
  await signUpFreshUser(page);

  await page.goto("/wardrobe");
  await expect(page.getByText("Nothing here yet")).toBeVisible();

  await page.goto("/wears");
  await expect(page.getByText(/no wears logged yet/i)).toBeVisible();

  await page.goto("/stats");
  await expect(page.getByText(/^No wears/)).toBeVisible();
});

test.describe("the seeded wardrobe", () => {
  // Read-only: this account is shared across workers and projects.
  test.use({ storageState: STORAGE_STATE });

  test("a perfume opens its page, and Back returns to the wardrobe", async ({ page }) => {
    await page.goto("/wardrobe");
    await page
      .getByRole("listitem")
      .filter({ hasText: "Hawas Ice" })
      .getByRole("link", { name: /^Hawas Ice/ })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Hawas Ice" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scent profile" })).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Wardrobe" }).click();
    await expect(page).toHaveURL(/\/wardrobe$/);
  });

  test("filters by type, with a count on each tab", async ({ page }) => {
    await page.goto("/wardrobe");
    const tabs = page.getByRole("navigation", { name: "Filter by type" });
    await expect(tabs.getByRole("link", { name: "All 10" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(tabs.getByRole("link", { name: "Bottles 7" })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Decants 1" })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Samples 1" })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Wishlist 1" })).toBeVisible();

    await tabs.getByRole("link", { name: "Decants 1" }).click();
    await expect(page).toHaveURL(/type=decant$/);
    const items = page.getByRole("list", { name: "Wardrobe items" }).getByRole("listitem");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("10 ml decant");
  });

  test("shows price, fill level, wear count, and cost per wear", async ({ page }) => {
    await page.goto("/wardrobe?type=bottle");
    const aventus = page.getByRole("listitem").filter({ hasText: "Aventus" });
    await expect(aventus).toContainText("62% full");
    await expect(aventus.getByRole("meter", { name: "Fill level" })).toHaveAttribute(
      "aria-valuenow",
      "62",
    );
    await expect(aventus).toContainText("₱17,950.00");
    await expect(aventus).toContainText(/₱[\d,]+\.\d{2} \(\d+ wears\)/);
  });

  test("uses the catalogue photo when there is one", async ({ page }) => {
    await page.goto("/wardrobe?type=bottle");
    const hawas = page.getByRole("listitem").filter({ hasText: "Hawas Ice" });
    await expect(hawas).toContainText("Rasasi");
    const photo = hawas.locator('img[src*="rasasi-hawas-ice"]');
    await expect(photo).toHaveCount(1);
    // Served and decoded, not a broken image.
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });

  test("the old collection URL lands on the wardrobe", async ({ page }) => {
    await page.goto("/collection");
    await expect(page).toHaveURL(/\/wardrobe$/);
  });
});
