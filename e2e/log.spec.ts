import { expect, test, type Page } from "@playwright/test";
import { addToWardrobe, signUpFreshUser, wallTimeAgo } from "./helpers";

/**
 * The Log flow and check-ins. The server runs with WEATHER_PROVIDER=static
 * (playwright.config.ts), so an attached snapshot is always 30°C / 70% / Clear.
 */
const ZONE = "Asia/Manila";
const HOUR = 60 * 60 * 1000;

test.use({
  timezoneId: ZONE,
  geolocation: { latitude: 14.5995, longitude: 120.9842 },
  permissions: ["geolocation"],
});

async function logWear(page: Page, itemId: string, opts: { hoursAgo?: number } = {}) {
  await page.goto(`/log?item=${itemId}`);
  if (opts.hoursAgo) await page.getByLabel("When").fill(wallTimeAgo(opts.hoursAgo * HOUR, ZONE));
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page).toHaveURL(/\/wears\/\w+$/);
}

test("log a wear from the wardrobe, with mood, visibility, and weather attached", async ({
  page,
}) => {
  await signUpFreshUser(page);
  await addToWardrobe(page, "Aventus");

  await page.goto("/wardrobe");
  await page.getByRole("link", { name: "Log a wear of Creed Aventus" }).click();
  await expect(page).toHaveURL(/\/log\?item=/);

  // Location is granted, so the preview shows (static) current weather.
  await expect(page.getByText(/Now 30°C · 70% humidity · Clear/)).toBeVisible();

  await page.getByRole("button", { name: "One more spray" }).click(); // 3 → 4
  await expect(page.getByLabel("Sprays")).toHaveValue("4");
  await page.getByRole("radio", { name: "Date" }).check();
  await page.getByRole("radio", { name: "Confident" }).check();
  await page.getByLabel("Note (optional)").fill("Dinner out");
  await page.getByRole("radio", { name: /^Only me/ }).check();
  await page.getByRole("button", { name: "Log wear" }).click();

  await expect(page).toHaveURL(/\/wears\/\w+$/);
  await expect(page.getByRole("heading", { name: "Aventus" })).toBeVisible();
  const details = page.locator("dl").first();
  await expect(details).toContainText("4");
  await expect(details).toContainText("Date");
  await expect(details).toContainText("Confident");
  await expect(details).toContainText("Only me");
  await expect(details).toContainText("30°C · 70% humidity · Clear");
  await expect(details).toContainText("Test weather (static provider)");
  await expect(details).toContainText("Dinner out");
  // Just logged: the first check-in opens in two hours.
  await expect(page.getByText(/Opens at/).first()).toBeVisible();

  // It counts towards the item.
  await page.goto("/wardrobe");
  await expect(page.getByRole("listitem").filter({ hasText: "Aventus" })).toContainText("(1 wear)");
});

test("choosing not to attach weather logs the wear without it", async ({ page }) => {
  await signUpFreshUser(page);
  const item = await addToWardrobe(page, "Layton");
  await page.goto(`/log?item=${item}`);
  await page.getByRole("button", { name: "Don’t attach" }).click();
  await expect(page.getByText("No weather will be attached.")).toBeVisible();
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page).toHaveURL(/\/wears\/\w+$/);
  await expect(page.locator("dl").first()).toContainText("Not recorded");
});

test("an open check-in can be answered from the wear page, once", async ({ page }) => {
  await signUpFreshUser(page);
  const item = await addToWardrobe(page, "Sauvage");
  await logWear(page, item, { hoursAgo: 3 });

  const checkIns = page.getByRole("region", { name: "Check-ins" });
  const prompt = page.getByRole("form", { name: "How is it doing at 2 hours?" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "Faint" }).click();

  await expect(page.getByRole("form", { name: /How is it doing/ })).toHaveCount(0);
  await expect(checkIns.getByText("Faint")).toBeVisible();
  await expect(checkIns.getByText(/Opens at/)).toHaveCount(2); // 4h and 8h still to come
});

test("prompts appear on the Log tab, and Gone stops later ones", async ({ page }) => {
  await signUpFreshUser(page);
  const item = await addToWardrobe(page, "Bleu de Chanel");
  await logWear(page, item, { hoursAgo: 5 });

  await page.goto("/log");
  const prompts = page.getByRole("region", { name: "Check-ins" });
  await expect(prompts).toContainText("4 hours in");
  await prompts.getByRole("button", { name: "Gone" }).click();
  await expect(page.getByRole("region", { name: "Check-ins" })).toHaveCount(0);

  await page.goto("/wears");
  await page
    .getByRole("link", { name: /Bleu de Chanel/ })
    .first()
    .click();
  await expect(page.getByText("Not needed — gone")).toBeVisible(); // the 8h check-in
  await expect(page.getByText("Not answered")).toBeVisible(); // the 2h one, skipped
});

test("sprays are 1 to 10, and a time in the future is refused", async ({ page }) => {
  await signUpFreshUser(page);
  const item = await addToWardrobe(page, "Aventus");
  await page.goto(`/log?item=${item}`);

  await page.getByLabel("Sprays").fill("10");
  await expect(page.getByRole("button", { name: "One more spray" })).toBeDisabled();
  await page.getByLabel("Sprays").fill("11");
  await page.getByLabel("When").fill(wallTimeAgo(-3 * HOUR, ZONE));
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page.getByText("10 sprays at most.")).toBeVisible();
  await expect(page.getByText("That's in the future.")).toHaveCount(0); // sprays fail first
  await page.getByLabel("Sprays").fill("2");
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page.getByText("That's in the future.")).toBeVisible();
  await expect(page).toHaveURL(/\/log\?item=/);
});

test("a wishlist entry can't be logged, and old log links still work", async ({ page }) => {
  await signUpFreshUser(page);
  const wish = await addToWardrobe(page, "Layton", { kind: "Wishlist" });
  await page.goto(`/log?item=${wish}`);
  await expect(page.getByText("Can't log that")).toBeVisible();

  const bottle = await addToWardrobe(page, "Aventus");
  await page.goto(`/wear/new?collectionItemId=${bottle}`);
  await expect(page).toHaveURL(new RegExp(`/log\\?collectionItemId=${bottle}$`));
  await expect(page.getByRole("button", { name: "Log wear" })).toBeVisible();
});

test("another user's wear is not found", async ({ page, browser }) => {
  await signUpFreshUser(page);
  const item = await addToWardrobe(page, "Aventus");
  await logWear(page, item);
  const url = page.url();

  const other = await browser.newContext({ timezoneId: ZONE });
  const otherPage = await other.newPage();
  await signUpFreshUser(otherPage);
  await otherPage.goto(url);
  await expect(otherPage.getByText("Wear not found")).toBeVisible();
  await otherPage.goto(`${url}/edit`);
  await expect(otherPage.getByText("Wear not found")).toBeVisible();
  await other.close();
});
