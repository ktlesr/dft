import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // The `server-only` marker package throws at import time outside
      // Next's RSC bundler. Vitest runs in plain node, so stub it.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
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
