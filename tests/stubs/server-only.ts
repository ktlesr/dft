// Empty stub for the `server-only` package, which throws at import time
// outside Next's RSC bundler. Vitest is a node test runner; the marker is
// not meaningful here, so we replace it with a no-op via vitest's
// `resolve.alias` (see vitest.config.ts).
export {};
