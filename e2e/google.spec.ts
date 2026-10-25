import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./helpers";

// The e2e server runs with a fake Google client (playwright.config.ts). These
// tests stop at the hand-off: requests to Google are answered locally.
test("Continue with Google hands off to Google with our callback", async ({ page }) => {
  let authorize: URL | null = null;
  await page.route("https://accounts.google.com/**", async (route) => {
    authorize = new URL(route.request().url());
    await route.fulfill({ contentType: "text/plain", body: "Google" });
  });

  await page.goto("/sign-in?next=/clubs");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect.poll(() => authorize?.pathname).toBe("/o/oauth2/v2/auth");

  const params = authorize!.searchParams;
  expect(params.get("client_id")).toBe("e2e-google-client");
  expect(new URL(params.get("redirect_uri")!).pathname).toBe("/api/auth/callback/google");
  expect(params.get("scope")).toContain("email");
  expect(params.get("code_challenge_method")).toBe("S256");
});

test("sign-up offers Google too", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("a Google sign-in for an email with a password explains what to do", async ({ page }) => {
  await page.goto("/sign-in?error=OAuthAccountNotLinked");
  // Filtered: Next's route announcer is also an alert.
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Sign in with it, then connect Google from your profile" }),
  ).toBeVisible();
});

test("the password can be shown and hidden", async ({ page }) => {
  await page.goto("/sign-in");
  const password = page.getByLabel("Password");
  await password.fill("hunter22-secret");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test.describe("a signed-in account", () => {
  test.use({ storageState: STORAGE_STATE });

  test("can connect Google from the profile", async ({ page }) => {
    await page.goto("/profile");
    const methods = page.getByRole("region", { name: "Sign-in methods" });
    await expect(methods).toContainText("PasswordSet");
    await expect(methods.getByRole("button", { name: "Connect Google" })).toBeVisible();
  });

  test("sees a failed connection on the profile, not the sign-in screen", async ({ page }) => {
    // Auth.js sends OAuth failures to /sign-in; a signed-in user is forwarded.
    await page.goto("/sign-in?error=OAuthAccountNotLinked");
    await expect(page).toHaveURL(/\/profile\?error=OAuthAccountNotLinked$/);
    await expect(
      page.getByRole("alert").filter({ hasText: "already linked to another" }),
    ).toBeVisible();
  });
});
