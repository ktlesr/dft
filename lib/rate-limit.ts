/**
 * Rate limiter with a pluggable store.
 *
 * Phase 5 ships an in-memory store (single-node, zero-dep). To scale to
 * multiple instances or survive restarts, drop in a Redis-backed store
 * that implements the same `RateLimitStore` interface:
 *
 *     export const store: RateLimitStore = new RedisStore(process.env.REDIS_URL);
 *     import { setStore } from "@/lib/rate-limit";
 *     setStore(store);
 *
 * Interface contract: `hit(key, limit, windowMs)` atomically increments
 * a counter and returns the current count + reset time. Atomicity is
 * required — a non-atomic read-then-write leaks requests under load.
 */

import { headers } from "next/headers";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export interface RateLimitStore {
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

/* ── In-memory store (default) ─────────────────────────────────── */

type Bucket = { count: number; resetAt: number };

class MemoryStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  constructor() {
    // GC expired buckets so the Map doesn't grow unbounded in long-running dev.
    if (typeof globalThis !== "undefined" && !(globalThis as { __rlGc?: boolean }).__rlGc) {
      (globalThis as { __rlGc?: boolean }).__rlGc = true;
      setInterval(() => this.sweep(), 60_000).unref?.();
    }
  }

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const b = this.buckets.get(key);

    if (!b || b.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: limit - 1,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    b.count += 1;
    const remaining = Math.max(0, limit - b.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return { allowed: b.count <= limit, remaining, retryAfterSeconds };
  }

  private sweep() {
    const now = Date.now();
    for (const [k, b] of this.buckets) {
      if (b.resetAt <= now) this.buckets.delete(k);
    }
  }
}

let store: RateLimitStore = new MemoryStore();

export function setStore(next: RateLimitStore): void {
  store = next;
}

/* ── Public API ────────────────────────────────────────────────── */

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return store.hit(key, limit, windowMs);
}

/**
 * Best-effort client IP. Works behind reverse proxies (Vercel, nginx,
 * Cloudflare) via the standard `x-forwarded-for` chain.
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
