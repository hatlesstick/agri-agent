import { serverEnv } from "@/config/env";

export type RateLimitDecision = { allowed: boolean; retryAfterMs: number };

export type RateLimiter = { check(key: string): RateLimitDecision };

type RateLimiterOptions = { limit: number; windowMs: number; maxKeys?: number; now?: () => number };

export function createRateLimiter({ limit, windowMs, maxKeys = 10_000, now = Date.now }: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key) {
      const time = now();
      const recent = (hits.get(key) ?? []).filter((hit) => hit > time - windowMs);
      hits.delete(key);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return { allowed: false, retryAfterMs: recent[0] + windowMs - time };
      }

      hits.set(key, [...recent, time]);
      while (hits.size > maxKeys) {
        const oldestKey = hits.keys().next().value;
        if (oldestKey === undefined) break;
        hits.delete(oldestKey);
      }
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function rateLimitedResponse(retryAfterMs: number): Response {
  return Response.json(
    { error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) } },
  );
}

const WINDOW_MS = 60_000;

export const chatRateLimiter = createRateLimiter({ limit: serverEnv().RATE_LIMIT_PER_MINUTE, windowMs: WINDOW_MS });
export const sprayCheckRateLimiter = createRateLimiter({ limit: serverEnv().RATE_LIMIT_PER_MINUTE, windowMs: WINDOW_MS });
