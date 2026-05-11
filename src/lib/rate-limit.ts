import { LRUCache } from "lru-cache";

/**
 * In-memory rate limiter using a sliding window algorithm.
 *
 * Why in-memory for MVP?
 * For a single-instance deployment (Vercel serverless with one warm instance,
 * or a single Railway process), an LRU cache is sufficient and has zero
 * infrastructure cost. For multi-instance deployments, replace with
 * Upstash Redis (free tier available) using the same interface.
 *
 * The LRU cache holds up to 10,000 IP entries. Each entry stores an array
 * of request timestamps within the current window. Old timestamps are
 * pruned on each check.
 */

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

// Store: IP address → array of request timestamps (epoch ms)
const cache = new LRUCache<string, number[]>({
  max: 10_000,
  // TTL: automatically evict entries after 2 minutes of inactivity
  ttl: 2 * 60 * 1000,
});

/**
 * Checks whether a request from the given IP is within the rate limit.
 *
 * @param ip      - The client IP address (use x-forwarded-for in production)
 * @param options - Rate limit configuration
 * @returns true if the request is allowed, false if rate limit exceeded
 */
export function rateLimit(ip: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  const windowStart = now - options.windowMs;

  // Get existing timestamps for this IP, filter out expired ones
  const timestamps = (cache.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= options.limit) {
    // Rate limit exceeded — update cache with pruned list (no new timestamp)
    cache.set(ip, timestamps);
    return false;
  }

  // Allow request — record this timestamp
  cache.set(ip, [...timestamps, now]);
  return true;
}

/**
 * Returns the number of remaining requests for an IP in the current window.
 * Useful for setting X-RateLimit-Remaining headers.
 */
export function getRateLimitRemaining(
  ip: string,
  options: RateLimitOptions
): number {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  const timestamps = (cache.get(ip) ?? []).filter((t) => t > windowStart);
  return Math.max(0, options.limit - timestamps.length);
}
