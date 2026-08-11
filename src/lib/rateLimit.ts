// Fixed-window rate limiter for route handlers that call paid third-party APIs.
//
// ponytail: in-memory Map — correct for a single server instance, which is what
// this app runs today. If this ever scales to multiple instances or serverless
// (where each cold start gets its own memory), swap the Map for Redis/Upstash;
// the check() signature stays the same.

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window resets — for the Retry-After header. */
  retryAfterSec: number;
}

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

/** Returns whether `key` may make another request, given `limit` per `windowMs`. */
export function check(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const elapsed = now - bucket.windowStart;
    return { allowed: false, retryAfterSec: Math.ceil((windowMs - elapsed) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Test seam — drops all state. */
export function reset(): void {
  buckets.clear();
}
