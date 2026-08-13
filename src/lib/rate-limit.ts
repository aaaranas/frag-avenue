import "server-only";

/**
 * Small in-memory token-bucket rate limiter.
 *
 * Scope: per Node process. Adequate for a single-instance MVP and for
 * discouraging trivial abuse of auth/weather endpoints. When we deploy behind
 * multiple serverless instances, this needs to move to a shared store (Redis /
 * Upstash / KV). Documented in `docs/ROADMAP.md`.
 */

type Bucket = { tokens: number; lastRefillMs: number };

const store = new Map<string, Bucket>();
// Cap the store to avoid unbounded growth under adversarial keys.
const MAX_KEYS = 10_000;

export type RateLimitResult =
  { allowed: true; remaining: number } | { allowed: false; retryAfterSeconds: number };

/**
 * Try to consume one token from the bucket for `key`.
 * `limit` tokens refill continuously across `windowMs`; a fresh bucket starts full.
 */
export function takeToken(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket) {
    if (store.size >= MAX_KEYS) evictOldest();
    bucket = { tokens: limit, lastRefillMs: now };
    store.set(key, bucket);
  } else {
    const elapsed = now - bucket.lastRefillMs;
    if (elapsed > 0) {
      const refill = (elapsed / windowMs) * limit;
      if (refill > 0) {
        bucket.tokens = Math.min(limit, bucket.tokens + refill);
        bucket.lastRefillMs = now;
      }
    }
  }

  if (bucket.tokens < 1) {
    const tokensNeeded = 1 - bucket.tokens;
    const msToRefill = (tokensNeeded / limit) * windowMs;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(msToRefill / 1000)) };
  }

  bucket.tokens -= 1;
  return { allowed: true, remaining: Math.floor(bucket.tokens) };
}

function evictOldest(): void {
  let oldestKey: string | null = null;
  let oldestAt = Infinity;
  for (const [k, v] of store) {
    if (v.lastRefillMs < oldestAt) {
      oldestAt = v.lastRefillMs;
      oldestKey = k;
    }
  }
  if (oldestKey) store.delete(oldestKey);
}

/** Test helper — resets the module-scoped bucket store. Not exported to app code. */
export function _resetRateLimitStore(): void {
  store.clear();
}
