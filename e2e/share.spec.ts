import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";
import { addToWardrobe, signUpFreshUser } from "./helpers";

/**
 * Sharing a wear as an image. Test browsers have no share sheet, so the image
 * is checked through "Save image": a PNG of the size its format promises.
 */

/** Width and height from a PNG's header (the IHDR chunk). */
async function pngSize(download: Download) {
  const png = await readFile((await download.path())!);
  expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

async function saveImage(page: Page): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("dialog").getByRole("button", { name: "Save image" }).click(),
  ]);
  return download;
}

test("your wear as a story or a post image, and no Share on others' wears", async ({
  page,
  browser,
}) => {
  const author = await signUpFreshUser(page);
  const item = await addToWardrobe(page, "Aventus");
  await page.goto(`/log?item=${item}`);
  await page.getByRole("radio", { name: /^Everyone/ }).check();
  await page.getByRole("button", { name: "Log wear" }).click();
  await expect(page).toHaveURL(/\/wears\/\w+$/);

  // From the feed: a story first.
  await page.goto("/feed");
  await page.getByRole("article").first().getByRole("button", { name: "Share Aventus" }).click();
  const dialog = page.getByRole("dialog", { name: "Share this wear" });
  await expect(
    dialog.getByRole("img", { name: "Preview: Creed Aventus, 1080×1920" }),
  ).toBeVisible();
  const story = await saveImage(page);
  expect(story.suggestedFilename()).toBe("frag-avenue-creed-aventus-story.png");
  expect(await pngSize(story)).toEqual({ width: 1080, height: 1920 });

  // Then a post, on another background.
  await dialog.getByRole("radio", { name: /^Post/ }).check();
  await dialog.getByRole("radio", { name: "Paper" }).check();
  await expect(
    dialog.getByRole("img", { name: "Preview: Creed Aventus, 1080×1350" }),
  ).toBeVisible();
  const post = await saveImage(page);
  expect(post.suggestedFilename()).toBe("frag-avenue-creed-aventus-post.png");
  expect(await pngSize(post)).toEqual({ width: 1080, height: 1350 });

  // Someone else can see the wear, but not share it.
  const context = await browser.newContext();
  const other = await context.newPage();
  await signUpFreshUser(other);
  await other.goto(`/u/${author.username}`);
  await expect(other.getByRole("article")).toHaveCount(1);
  await expect(other.getByRole("button", { name: /^Share/ })).toHaveCount(0);
  await context.close();
});
