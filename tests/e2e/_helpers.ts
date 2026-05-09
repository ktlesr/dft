import { test as base } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * Shared E2E setup. We hand each test a unique X-Forwarded-For so the
 * in-memory rate-limit store at lib/rate-limit.ts buckets every test
 * separately. Without this, repeated runs eventually trip the global
 * login / forgot-password limiters and turn green tests red for reasons
 * unrelated to the security contract under test.
 *
 * `getClientIp()` only string-matches the value, so a UUID-tagged fake
 * works as a bucket key. UUIDs avoid the worker-local counter collision
 * we'd hit with `${counter}` (12 workers each starting from 0 produce
 * the same low IPs in parallel).
 */
function uniqueClientIp(): string {
  return `e2e-${randomUUID()}`;
}

export const test = base.extend({});

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueClientIp() });
});

export { expect } from "@playwright/test";
