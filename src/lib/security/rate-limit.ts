type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
const MAX_BUCKETS = 5000;

/** Best-effort per-instance limiter. Vercel instances are independent; use Redis for global limits. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const current = buckets.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  entry.count += 1;
  buckets.set(key, entry);
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_BUCKETS) {
      const evictions = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
      for (let i = 0; i < buckets.size - MAX_BUCKETS; i += 1) buckets.delete(evictions[i][0]);
    }
  }
  const ok = entry.count <= limit;
  return { ok, remaining: Math.max(0, limit - entry.count), retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
}

export function requestIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

