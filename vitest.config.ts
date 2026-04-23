import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Unit tests only — e2e lives under /tests/e2e and is driven by Playwright.
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    environment: "node",
    globals: false,
    // Don't spin up Next's edge / browser tooling for these;
    // they are pure-function tests against `lib/*` and `features/**/schemas.ts`.
  },
});
