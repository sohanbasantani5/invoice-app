import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/security/rate-limit";
import { safeErrorInfo } from "@/lib/security/logging";

describe("rateLimit", () => {
  it("blocks requests after the configured threshold", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    const third = rateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.retryAfter).toBeGreaterThan(0);
  });

  it("evicts reset-soonest buckets at the hard cap", () => {
    const prefix = `flood-${Math.random()}-`;
    for (let i = 0; i < 5_005; i += 1) rateLimit(`${prefix}${i}`, 2, 60_000);
    const first = rateLimit(`${prefix}0`, 2, 60_000);
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(1);
  });

  it("logs only safe error metadata", () => {
    const result = safeErrorInfo(new Error("refresh_token=do-not-log"));
    expect(result).toEqual({ name: "Error" });
    expect(JSON.stringify(result)).not.toContain("refresh_token");
  });
});
