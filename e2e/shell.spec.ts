import { expect, test, type Page } from "@playwright/test";
import { STORAGE_STATE } from "./helpers";

// Read-only: uses the shared seeded session and never writes.
test.use({ storageState: STORAGE_STATE, viewport: { width: 390, height: 844 } });

const tabBar = (page: Page) => page.getByRole("navigation", { name: "Primary" }).first();

test("the mobile tab bar has the five tabs with Log in the centre", async ({ page }) => {
  await page.goto("/feed");
  const links = tabBar(page).getByRole("link");
  await expect(links).toHaveCount(5);
  await expect(links.nth(0)).toHaveAccessibleName("Feed");
  await expect(links.nth(1)).toHaveAccessibleName("Wardrobe");
  await expect(links.nth(2)).toHaveAccessibleName("Log a wear");
  await expect(links.nth(3)).toHaveAccessibleName("Stats");
  await expect(links.nth(4)).toHaveAccessibleName("Clubs");
});

test("every tab and the profile link is at least 44×44px", async ({ page }) => {
  await page.goto("/feed");
  const targets = [
    ...(await tabBar(page).getByRole("link").all()),
    page.getByRole("banner").getByRole("link", { name: "Profile" }),
  ];
  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box, await target.getAttribute("href")).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

const DESTINATIONS = [
  { tab: "Wardrobe", url: /\/wardrobe$/ },
  { tab: "Log a wear", url: /\/log$/ },
  { tab: "Stats", url: /\/insights$/ },
  { tab: "Clubs", url: /\/clubs$/ },
  { tab: "Feed", url: /\/feed$/ },
];

for (const { tab, url } of DESTINATIONS) {
  test(`the ${tab} tab opens its page and becomes current`, async ({ page }) => {
    await page.goto(tab === "Feed" ? "/clubs" : "/feed");
    await page.waitForLoadState("networkidle");
    await tabBar(page).getByRole("link", { name: tab, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(tabBar(page).getByRole("link", { name: tab, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
}

test("the PWA starts on the feed", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/feed");
});
