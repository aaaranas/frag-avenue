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
    },
  },
});
