/**
 * Best-effort in-memory rate limiter (fixed window).
 *
 * Caveat: on serverless (Vercel) memory isn't shared across instances, so this is
 * a per-instance courtesy guard, not a strict global limit. Supabase Auth already
 * rate-limits the auth endpoints (the main abuse vector); for strict distributed
 * limits across the app, add a shared store (e.g. Upstash Redis) later.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}
