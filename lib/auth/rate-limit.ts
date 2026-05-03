// Simple in-memory rate limiter — fine for single-region Vercel + low volume.
// For multi-instance use Upstash; not needed at ~15 itineraries/day.

type Bucket = { count: number; resetAt: number };

const ipBuckets = new Map<string, Bucket>();
const emailBuckets = new Map<string, Bucket>();

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

function take(map: Map<string, Bucket>, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = map.get(key);
  if (!b || b.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count };
}

export function takeIpAttempt(ip: string) {
  // 10 attempts per 15 minutes per IP
  return take(ipBuckets, `ip:${ip}`, 10, FIFTEEN_MIN_MS);
}

export function takeEmailAttempt(email: string) {
  // After 5 failed attempts per email, the account is locked for 15 min.
  // We track failures via DB column `failed_attempts` + `locked_until`,
  // so this in-memory bucket is just a soft pre-check.
  return take(emailBuckets, `e:${email.toLowerCase()}`, 50, FIFTEEN_MIN_MS);
}
