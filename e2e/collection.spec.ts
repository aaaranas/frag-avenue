import { test, expect } from "@playwright/test";
import { STORAGE_STATE, signUpFreshUser } from "./helpers";

/**
 * Requires a running Postgres and a seeded database:
 *   pnpm db:up && pnpm db:migrate && pnpm db:seed
 * Playwright's `webServer` config then starts `pnpm start` on demand.
 */

test("golden path: sign up, add a bottle, log a wear, and see it reflected", async ({ page }) => {
  await signUpFreshUser(page);

  // --- Add a bottle to the collection ---
  await page.goto("/fragrances");
  const aventus = page.getByRole("link", { name: /Creed Aventus/i });
  await expect(aventus).toBeVisible();

  // The grid streams in behind a Suspense boundary, and a click landing between
  // the anchor painting and the App Router hydrating is swallowed — the router
  // has intercepted the anchor but cannot yet navigate. Waiting for the network
  // to settle is the cheap proxy for "hydrated". Retrying the click instead is
  // worse: a second click aborts the navigation the first one started, which
  // leaves the URL updated but the old page still rendered.
  await page.waitForLoadState("networkidle");
  await aventus.click();

  await expect(page).toHaveURL(/\/fragrances\/\w+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Aventus" })).toBeVisible();

  await page.getByLabel("Size (ml)").fill("100");
  await page.getByRole("button", { name: /save to my collection/i }).click();
  await expect(page).toHaveURL(/\/collection$/);

  // The shelf renders bottles as expandable cards, not links.
  const card = page.getByRole("button", { name: /Creed Aventus/i });
  await expect(card).toBeVisible();

  // --- Log a wear, straight from the card ---
  await page.getByRole("link", { name: /^Log a wear of Creed Aventus$/ }).click();
  await expect(page.getByRole("heading", { name: "Log a wear" })).toBeVisible();
  await page.getByLabel("Sprays").fill("6");
  await page.getByRole("button", { name: "Log wear" }).click();

  await expect(page).toHaveURL(/\/wear$/);
  await expect(page.getByText(/aventus/i).first()).toBeVisible();
  await expect(page.getByText("6 sprays")).toBeVisible();

  // --- Dashboard reflects it ---
  await page.goto("/dashboard");
  const summary = page.getByRole("region", { name: "Summary" });
  await expect(summary.getByText("Fragrances")).toBeVisible();
  await expect(summary.getByText("Wears", { exact: true })).toBeVisible();

  // --- Advisor can now suggest the bottle we own ---
  await page.goto("/advisor");
  await expect(page.getByRole("heading", { name: "What should I wear?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /aventus/i }).first()).toBeVisible();
});

test("a fresh account sees empty states rather than errors", async ({ page }) => {
  await signUpFreshUser(page);

  await page.goto("/collection");
  await expect(page.getByText(/your shelves are empty/i)).toBeVisible();

  await page.goto("/wear");
  await expect(page.getByText(/no wears logged yet/i)).toBeVisible();

  await page.goto("/advisor");
  await expect(page.getByText(/nothing to suggest yet/i)).toBeVisible();
});

test.describe("the seeded shelf", () => {
  // Read-only: this account is shared across workers and projects, so nothing
  // in here may write. The session comes from e2e/auth.setup.ts.
  test.use({ storageState: STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto("/collection");
  });

  test("shows every seeded bottle with a one-click log-wear link", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Creed Aventus/ })).toBeVisible();
    // 7 seeded bottles, each with its own log-wear affordance.
    await expect(page.getByRole("link", { name: /^Log a wear of / })).toHaveCount(7);
  });

  test("names each card with what the illustration encodes", async ({ page }) => {
    // The SVG is aria-hidden, so the silhouette and fill level have to be
    // reachable as text.
    const card = page.getByRole("button", { name: /Creed Aventus/ });
    const label = await card.getAttribute("aria-label");

    expect(label).toContain("100 ml EDP");
    expect(label).toContain("flattened flask"); // curated shape for Aventus
    expect(label).toContain("62 ml left");
  });

  test("shows the fill level as text under the bottle", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Creed Aventus/ })).toContainText("Part used");
  });

  test("explains what the bottles show", async ({ page }) => {
    const legend = page.getByText("What the bottles show +");
    await expect(legend).toBeVisible();

    await legend.click();
    await expect(page.getByText(/inferred from the concentration/i)).toBeVisible();
    await expect(page.getByText(/strongest accord/i)).toBeVisible();
  });

  test("opens a detail panel with notes and closes on Escape", async ({ page }) => {
    await page.getByRole("button", { name: /Creed Aventus/ }).click();

    const panel = page.getByRole("heading", { name: "Aventus", exact: true });
    await expect(panel).toBeVisible();
    await expect(page.getByText("pineapple, bergamot, black currant, apple")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });
});

test.describe("the seeded account's analytics", () => {
  test.use({ storageState: STORAGE_STATE });

  test("the advisor scores rather than falling back to cold-start", async ({ page }) => {
    // The seed deliberately crosses the cold-start thresholds (30 wears across
    // 7 fragrances, all rated), so a percentage must be shown.
    await page.goto("/advisor");

    await expect(page.getByText("Match").first()).toBeVisible();
    await expect(page.getByText("Cold-start")).toHaveCount(0);
  });

  test("insights renders real patterns instead of the not-enough-data state", async ({ page }) => {
    await page.goto("/insights");

    await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
    await expect(page.getByText(/not enough data yet/i)).toHaveCount(0);
    await expect(page.getByText("Preferred accords")).toBeVisible();
    await expect(page.getByText("Seasonal pattern")).toBeVisible();
  });

  test("the dashboard flags the deliberately neglected bottle", async ({ page }) => {
    // Tobacco Vanille is owned past 90 days and last worn past 60.
    await page.goto("/dashboard");

    const neglected = page.getByRole("region", { name: "Neglected" });
    await expect(neglected).toContainText("Tobacco Vanille");
  });
});
