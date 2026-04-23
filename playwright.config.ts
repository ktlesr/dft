import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal Playwright config for DFT Portal smoke tests.
 *
 * Assumes `pnpm dev` (or a deployed instance reachable via PLAYWRIGHT_BASE_URL)
 * is already running. Avoids running its own `webServer` so CI and local
 * developers don't collide with an already-running dev server on 3000.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
