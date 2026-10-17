/**
 * Simple in-memory rate limiter for data-plane endpoints.
 *
 * For production with multiple server instances, replace with Redis-backed
 * sliding window or token bucket. This implementation is sufficient for
 * single-instance deployments and protects against obvious abuse patterns.
 *
 * Limits are per (apiKey, action) tuples. We track a sliding 60-second window.
 */

type Bucket = {
  count: number;
  resetAt: number; // epoch ms
};

const buckets = new Map<string, Bucket>();

// Prune expired buckets every 5 minutes to avoid unbounded memory growth.
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let lastPruneAt = 0;

function prune() {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  for (const [k, b] of buckets.entries()) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
  limit: number;
};

/**
 * Check the rate limit for a key. If `increment` is true (default), the bucket
 * is incremented; otherwise we just check.
 *
 * Returns:
 * - allowed: true if request should be allowed
 * - remaining: number of requests left in the window
 * - resetAtMs: when the window resets (epoch ms)
 * - limit: max requests per window
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000,
  increment: boolean = true
): RateLimitResult {
  prune();
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  if (increment) {
    bucket.count += 1;
  }
  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    resetAtMs: bucket.resetAt,
    limit,
  };
}

/**
 * Convenience: rate limit by API key + endpoint. Returns a 429 response if exceeded.
 * Caller should pass `apiKeyHash` (not raw key) to avoid high-cardinality on map keys.
 */
export function checkRateLimitOrError(
  apiKeyHash: string,
  endpoint: string,
  limit: number = 100,
  windowMs: number = 60_000
): Response | null {
  const result = rateLimit(`${apiKeyHash}:${endpoint}`, limit, windowMs, true);
  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.resetAtMs - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ${retryAfterSec} ثانیه دیگر تلاش کنید.`,
          retryAfter: retryAfterSec,
          limit: result.limit,
        },
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(retryAfterSec),
          "x-ratelimit-limit": String(result.limit),
          "x-ratelimit-remaining": String(result.remaining),
          "x-ratelimit-reset": String(Math.floor(result.resetAtMs / 1000)),
        },
      }
    );
  }
  return null;
}

/**
 * Reset all rate-limit state. Useful for tests.
 */
export function resetRateLimits(): void {
  buckets.clear();
}
