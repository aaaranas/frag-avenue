import { test, expect } from "@playwright/test";

type ManifestIcon = { src: string; sizes: string; type: string; purpose?: string };

test("the manifest's icons and the touch icon are served", async ({ page, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/feed");
  expect(manifest.display).toBe("standalone");

  const icons: ManifestIcon[] = manifest.icons;
  // Chromium's install criteria: a 192px and a 512px PNG; Android also wants a maskable one.
  expect(icons.map((i) => `${i.sizes} ${i.type} ${i.purpose ?? "any"}`)).toEqual(
    expect.arrayContaining([
      "192x192 image/png any",
      "512x512 image/png any",
      "512x512 image/png maskable",
    ]),
  );
  for (const icon of icons) {
    const res = await request.get(icon.src);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()["content-type"], icon.src).toContain(icon.type);
  }

  await page.goto("/sign-in");
  const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(touch).toBe("/icons/apple-touch-icon.png");
  expect((await request.get(touch!)).headers()["content-type"]).toContain("image/png");
});

test("Chromium reports no installability errors", async ({ page, browserName }) => {
  test.skip(
    browserName !== "chromium",
    "installability errors come from the Chrome DevTools Protocol",
  );
  await page.goto("/sign-in");
  // The service worker must control the page before Chromium counts it.
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cdp = await page.context().newCDPSession(page);
  // Test contexts are incognito, where Chromium never offers an install; that
  // one is about the test browser, not the app.
  const errors = async () =>
    (await cdp.send("Page.getInstallabilityErrors")).installabilityErrors
      .map((e) => e.errorId)
      .filter((id) => id !== "in-incognito");
  await expect.poll(errors).toEqual([]);
});
