import { expect, test, type Browser, type Page } from "@playwright/test";
import { STORAGE_STATE, addToWardrobe, signUpFreshUser } from "./helpers";

/**
 * Feed and social, across two real accounts. Visibility rules under test:
 * PUBLIC → anyone signed in; FOLLOWERS → followers too; PRIVATE → owner only.
 */

type Visibility = "Everyone" | "Followers" | "Only me";

async function logWear(page: Page, itemId: string, visibility: Visibility, mood: string) {
  await page.goto(`/log?item=${itemId}`);
  await page.getByRole("radio", { name: mood }).check();
  await page.getByRole("radio", { name: new RegExp(`^${visibility}`) }).check();
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page).toHaveURL(/\/wears\/\w+$/);
  return page.url();
}

async function newUser(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const account = await signUpFreshUser(page);
  return { context, page, ...account };
}

const cards = (page: Page) => page.getByRole("article");

test("visibility, follows, kudos, and comments between two people", async ({ page, browser }) => {
  // Author: three wears, one per visibility, told apart by mood.
  const author = await signUpFreshUser(page);
  const item = await addToWardrobe(page, "Aventus");
  await logWear(page, item, "Everyone", "Confident");
  const followersUrl = await logWear(page, item, "Followers", "Relaxed");
  const privateUrl = await logWear(page, item, "Only me", "Happy");

  // The author's own feed shows all three, each marked with its visibility.
  await page.goto("/feed");
  await expect(cards(page)).toHaveCount(3);
  await expect(page.getByRole("list", { name: "Wears" })).toContainText("Only me");

  // A stranger sees only the public wear, and nothing in their feed.
  const viewer = await newUser(browser);
  const v = viewer.page;
  await v.goto(`/u/${author.username}`);
  await expect(cards(v)).toHaveCount(1);
  await expect(cards(v).first()).toContainText("Confident");
  await v.goto(privateUrl);
  await expect(v.getByText("Wear not found")).toBeVisible();
  await v.goto(followersUrl);
  await expect(v.getByText("Wear not found")).toBeVisible();
  await v.goto("/feed");
  await expect(v.getByText("Your feed is quiet")).toBeVisible();

  // After following: public and followers-only, never private.
  await v.goto(`/u/${author.username}`);
  await v.getByRole("button", { name: `Follow @${author.username}` }).click();
  await expect(v.getByRole("button", { name: `Unfollow @${author.username}` })).toBeVisible();
  await expect(cards(v)).toHaveCount(2);
  await expect(v.getByRole("list", { name: "Wears" })).not.toContainText("Happy");
  await v.goto("/feed");
  await expect(cards(v)).toHaveCount(2);
  await v.goto(privateUrl);
  await expect(v.getByText("Wear not found")).toBeVisible();

  // Kudos on the public wear, from the feed; it persists.
  await v.goto("/feed");
  const publicCard = cards(v).filter({ hasText: "Confident" });
  const kudos = publicCard.getByRole("button", { name: /Give kudos to/ });
  // The button updates optimistically; wait for the server action itself.
  await Promise.all([
    v.waitForResponse((r) => r.request().method() === "POST" && r.ok()),
    kudos.click(),
  ]);
  await expect(publicCard.getByRole("button", { name: /Remove kudos from/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await v.reload();
  await expect(cards(v).filter({ hasText: "Confident" })).toContainText("1 kudo");

  // A comment on the followers-only wear.
  await v.goto(followersUrl);
  await v.getByLabel("Add a comment").fill("Great choice for today");
  await v.getByRole("button", { name: "Post" }).click();
  await expect(v.getByRole("list", { name: "Comments" })).toContainText("Great choice for today");
  await expect(v.getByLabel("Add a comment")).toHaveValue("");

  // The author sees it, can't kudos their own wear, and can delete the comment.
  await page.goto(followersUrl);
  await expect(page.getByRole("list", { name: "Comments" })).toContainText(
    "Great choice for today",
  );
  await expect(page.getByRole("button", { name: /Give kudos/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Delete comment by/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No comments yet.")).toBeVisible();

  // Unfollowing takes followers-only wears away again.
  await v.goto(`/u/${author.username}`);
  await v.getByRole("button", { name: `Unfollow @${author.username}` }).click();
  await expect(cards(v)).toHaveCount(1);
  await v.goto(followersUrl);
  await expect(v.getByText("Wear not found")).toBeVisible();

  await viewer.context.close();
});

test("people search finds someone to follow", async ({ page, browser }) => {
  const target = await newUser(browser);
  await signUpFreshUser(page);
  await page.goto(`/people?q=${target.username}`);
  const people = page.getByRole("list", { name: "People" });
  await expect(people).toContainText(`@${target.username}`);
  await people.getByRole("button", { name: `Follow @${target.username}` }).click();
  await expect(page.getByRole("button", { name: `Unfollow @${target.username}` })).toBeVisible();
  await target.context.close();
});

test("sign-up refuses a username that's taken", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.locator('input[name="timezone"]')).not.toHaveValue("");
  await page.getByLabel("Username").fill("DEV"); // the seeded account, in any case
  await page.getByLabel("Email").fill(`e2e-taken-${Date.now()}@frag.test`);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText("That username is taken.")).toBeVisible();
  // The rest of the form is kept.
  await expect(page.getByLabel("Username")).toHaveValue("DEV");
});

test.describe("the seeded feed", () => {
  test.use({ storageState: STORAGE_STATE });

  test("shows Pick for today, followed people's shared wears, and pages", async ({ page }) => {
    await page.goto("/feed");
    const pick = page.getByRole("region", { name: "Pick for today" });
    await expect(pick.getByRole("link", { name: "Wear it today" })).toHaveAttribute(
      "href",
      /\/log\?item=/,
    );
    // Mika's public and followers-only wears; never her private one (Casual).
    const mika = cards(page).filter({ hasText: "Mika" });
    await expect(mika).toHaveCount(2);
    await expect(mika.filter({ hasText: "Casual" })).toHaveCount(0);
    // 30 seeded wears + Mika's 2 → more than one page.
    await expect(page.getByRole("link", { name: "Load more" })).toBeVisible();
    await page.getByRole("link", { name: "Load more" }).click();
    await expect(page).toHaveURL(/cursor=/);
    await expect(cards(page).first()).toBeVisible();
  });

  test("a profile shows follower counts and its owner's shared wears", async ({ page }) => {
    await page.goto("/u/mika");
    await expect(page.getByRole("heading", { name: "Mika" })).toBeVisible();
    await expect(page.getByText(/1\s+follower/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Unfollow Mika" })).toBeVisible();
    await expect(cards(page)).toHaveCount(2);
  });
});
