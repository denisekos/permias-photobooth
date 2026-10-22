import "server-only";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter kept in process memory. On serverless each instance has its own
 * window, so treat it as a speed bump against ID guessing, not a hard guarantee.
 */
export function rateLimit(name: string, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const id = `${name}:${key}`;
  const b = buckets.get(id);
  if (!b || b.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= limit;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
