/**
 * Simple in-memory rate limiter.
 *
 * Good enough for Phase 2 / single-node dev. In Phase 5 this gets swapped
 * for a Redis-backed implementation (same interface) so it survives
 * multiple Next.js instances and restarts.
 */

import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  b.count += 1;
  const remaining = Math.max(0, limit - b.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
  return { allowed: b.count <= limit, remaining, retryAfterSeconds };
}

/**
 * Extract the best-effort client IP from request headers.
 * Works behind reverse proxies (Vercel, nginx, Cloudflare).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "unknown";
}

export async function getUserAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent");
}

/** Periodic GC — keep the bucket map from growing unbounded in long-running dev. */
if (typeof globalThis !== "undefined" && !(globalThis as { __rlGc?: boolean }).__rlGc) {
  (globalThis as { __rlGc?: boolean }).__rlGc = true;
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }, 60_000).unref?.();
}
