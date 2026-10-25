import { expect, test, type Page } from "@playwright/test";
import { STORAGE_STATE, addToWardrobe, signUpFreshUser } from "./helpers";

type Visibility = "Everyone" | "Followers" | "Only me";

async function logWear(page: Page, itemId: string, visibility: Visibility = "Followers") {
  await page.goto(`/log?item=${itemId}`);
  await page.getByRole("radio", { name: new RegExp(`^${visibility}`) }).check();
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page).toHaveURL(/\/wears\/\w+$/);
}

async function createClub(page: Page, name: string) {
  await page.goto("/clubs/new");
  await page.getByLabel("Club name").fill(name);
  await page.getByRole("button", { name: "Create club" }).click();
  // "/clubs/new" itself matches a slug pattern, so wait to have left it.
  await expect(page).not.toHaveURL(/\/clubs\/new$/);
  await expect(page).toHaveURL(/\/clubs\/[\w-]+$/);
  return page.url();
}

const board = (page: Page, title: string) =>
  page.getByRole("list", { name: `${title} leaderboard` });
const SCENTS = "30 different scents in 30 days";
const HOUSES = "5 different houses in 30 days";

test("challenge progress updates live as you log", async ({ page }) => {
  await signUpFreshUser(page);
  await page.goto("/clubs");
  await expect(page.getByRole("meter", { name: SCENTS })).toHaveAttribute(
    "aria-valuetext",
    "0 of 30 scents",
  );

  const aventus = await addToWardrobe(page, "Aventus");
  const layton = await addToWardrobe(page, "Layton");
  await logWear(page, aventus);
  await logWear(page, aventus); // the same scent twice counts once
  await logWear(page, layton);

  await page.goto("/clubs");
  await expect(page.getByRole("meter", { name: SCENTS })).toHaveAttribute(
    "aria-valuetext",
    "2 of 30 scents",
  );
  await expect(page.getByRole("meter", { name: HOUSES })).toHaveAttribute(
    "aria-valuetext",
    "2 of 5 houses",
  );
});

test("create, join, and leave a club; leaderboards count only wears the viewer may see", async ({
  page,
  browser,
}) => {
  // Founder: creates the club and logs one private and one public wear.
  const founder = await signUpFreshUser(page);
  const name = `E2E Club ${Date.now()}`;
  const clubUrl = await createClub(page, name);
  await expect(page.getByRole("button", { name: `Leave ${name}` })).toBeVisible();
  await expect(page.getByText("1 member")).toBeVisible();
  const aventus = await addToWardrobe(page, "Aventus");
  const layton = await addToWardrobe(page, "Layton");
  await logWear(page, aventus, "Only me");
  await logWear(page, layton, "Everyone");

  // The founder sees both of their own wears on the board.
  await page.goto(clubUrl);
  await expect(board(page, SCENTS)).toContainText("You2/30 scents");

  // A second person joins…
  const other = await browser.newContext();
  const o = await other.newPage();
  await signUpFreshUser(o);
  await o.goto(clubUrl);
  await o.getByRole("button", { name: `Join ${name}` }).click();
  await expect(o.getByRole("button", { name: `Leave ${name}` })).toBeVisible();
  await expect(o.getByText("2 members")).toBeVisible();

  // …and sees the founder's public wear only: 1, not 2.
  const founderRow = board(o, SCENTS)
    .getByRole("listitem")
    .filter({ hasText: `@${founder.username}` });
  await expect(founderRow).toContainText("1/30 scents");
  await expect(board(o, SCENTS)).toContainText("You0/30 scents");

  // Leaving takes them off the board.
  await o.getByRole("button", { name: `Leave ${name}` }).click();
  await expect(o.getByRole("button", { name: `Join ${name}` })).toBeVisible();
  await expect(o.getByText("1 member")).toBeVisible();
  await expect(board(o, SCENTS)).not.toContainText("You");
  await other.close();
});

test("club names are unique", async ({ page }) => {
  await signUpFreshUser(page);
  const name = `E2E Unique ${Date.now()}`;
  await createClub(page, name);
  await page.goto("/clubs/new");
  await page.getByLabel("Club name").fill(name.toUpperCase());
  await page.getByRole("button", { name: "Create club" }).click();
  await expect(page.getByText("A club with that name exists.")).toBeVisible();
  await expect(page.getByLabel("Club name")).toHaveValue(name.toUpperCase());
});

test.describe("the seeded club", () => {
  test.use({ storageState: STORAGE_STATE });

  test("lists your clubs and shows both members on the leaderboards", async ({ page }) => {
    await page.goto("/clubs");
    const mine = page.getByRole("list", { name: "Your clubs" });
    await expect(mine).toContainText("Manila Fragheads");
    await mine.getByRole("link", { name: /Manila Fragheads/ }).click();
    await expect(page.getByRole("heading", { name: "Manila Fragheads" })).toBeVisible();
    for (const title of [SCENTS, HOUSES]) {
      await expect(board(page, title).getByRole("listitem")).toHaveCount(2);
      await expect(board(page, title)).toContainText("Mika");
      await expect(board(page, title)).toContainText("You");
    }
  });

  test("an unknown club is not found", async ({ page }) => {
    await page.goto("/clubs/no-such-club");
    await expect(page.getByText("No such club")).toBeVisible();
  });
});
