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

const UNTRUSTED_CLIENT = "untrusted-client";

export function clientKey(req: Request, trustedProxyHops: number = serverEnv().TRUSTED_PROXY_HOPS): string {
  if (trustedProxyHops === 0) return UNTRUSTED_CLIENT;
  const hops = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  return hops.at(-trustedProxyHops) ?? UNTRUSTED_CLIENT;
}

export function rateLimitedResponse(retryAfterMs: number): Response {
  return Response.json(
    { error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) } },
  );
}

const WINDOW_MS = 60_000;

const globalRateLimiter = createRateLimiter({ limit: serverEnv().GLOBAL_RATE_LIMIT_PER_MINUTE, windowMs: WINDOW_MS });
const chatRateLimiter = createRateLimiter({ limit: serverEnv().RATE_LIMIT_PER_MINUTE, windowMs: WINDOW_MS });
const sprayCheckRateLimiter = createRateLimiter({ limit: serverEnv().RATE_LIMIT_PER_MINUTE, windowMs: WINDOW_MS });

const ROUTE_LIMITERS = { chat: chatRateLimiter, sprayCheck: sprayCheckRateLimiter } as const;

export function checkRateLimit(req: Request, route: keyof typeof ROUTE_LIMITERS): RateLimitDecision {
  const global = globalRateLimiter.check("global");
  if (!global.allowed) return global;
  return ROUTE_LIMITERS[route].check(clientKey(req));
}
