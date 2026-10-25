import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  // Everything runs against a single `next start` process. Left unbounded,
  // Playwright spawns one worker per two cores and the server — not the app
  // logic — becomes the thing that fails, as slow server-rendered responses
  // time out assertions.
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  expect: {
    // 5s is tight for a server-rendered page under parallel load.
    timeout: 10_000,
  },
  projects: [
    // Signs in as the seeded account once and saves the session for the specs
    // that opt into it with `test.use({ storageState: STORAGE_STATE })`.
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // The suite drives real sign-ins and sign-ups from one IP across two
      // browser projects. The production defaults (10 and 5) are correct for
      // production and far too small for that; raising them here keeps the
      // limiter in play without it becoming the thing under test.
      AUTH_SIGNIN_ATTEMPTS: "500",
      AUTH_SIGNUP_ATTEMPTS: "200",
      // Fixed weather readings instead of calling Open-Meteo: deterministic,
      // and CI need not reach the internet. Never set in production.
      WEATHER_PROVIDER: "static",
      // A fake Google OAuth client, so the "Continue with Google" button shows
      // and the hand-off to Google can be asserted. The test intercepts the
      // request to Google; nothing reaches it.
      AUTH_GOOGLE_ID: "e2e-google-client",
      AUTH_GOOGLE_SECRET: "e2e-google-secret",
    },
  },
});
