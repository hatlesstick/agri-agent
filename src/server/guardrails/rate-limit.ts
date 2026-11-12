import { serverEnv } from "@/shared/config/env";

export type RateLimitDecision = { allowed: boolean; retryAfterMs: number };

export type RateLimiter = {
  peek(key: string): RateLimitDecision;
  record(key: string): void;
  check(key: string): RateLimitDecision;
};

type RateLimiterOptions = { limit: number; windowMs: number; maxKeys?: number; now?: () => number };

export function createRateLimiter({ limit, windowMs, maxKeys = 10_000, now = Date.now }: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();

  const recentHits = (key: string, time: number) => (hits.get(key) ?? []).filter((hit) => hit > time - windowMs);

  const peek = (key: string): RateLimitDecision => {
    const time = now();
    const recent = recentHits(key, time);
    return recent.length >= limit ? { allowed: false, retryAfterMs: recent[0] + windowMs - time } : { allowed: true, retryAfterMs: 0 };
  };

  const record = (key: string): void => {
    const time = now();
    const recent = recentHits(key, time);
    hits.delete(key);
    hits.set(key, [...recent, time]);
    while (hits.size > maxKeys) {
      const oldestKey = hits.keys().next().value;
      if (oldestKey === undefined) break;
      hits.delete(oldestKey);
    }
  };

  return {
    peek,
    record,
    check(key) {
      const decision = peek(key);
      if (decision.allowed) record(key);
      return decision;
    },
  };
}

const UNTRUSTED_CLIENT = "untrusted-client";

export function clientKey(req: Request, trustedProxyHops: number = serverEnv().TRUSTED_PROXY_HOPS ?? 0): string {
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

type RateLimitedRoute = "chat" | "sprayCheck";

type ServerLimiters = { global: RateLimiter; routes: Record<RateLimitedRoute, RateLimiter> };

let serverLimiters: ServerLimiters | null = null;

function limitersFromEnv(): ServerLimiters {
  if (serverLimiters) return serverLimiters;
  const env = serverEnv();
  serverLimiters = {
    global: createRateLimiter({ limit: env.GLOBAL_RATE_LIMIT_PER_MINUTE, windowMs: WINDOW_MS }),
    routes: {
      chat: createRateLimiter({ limit: env.RATE_LIMIT_PER_MINUTE, windowMs: WINDOW_MS }),
      sprayCheck: createRateLimiter({ limit: env.RATE_LIMIT_PER_MINUTE, windowMs: WINDOW_MS }),
    },
  };
  return serverLimiters;
}

const GLOBAL_KEY = "global";

export function checkLimits(limiters: Array<{ limiter: RateLimiter; key: string }>): RateLimitDecision {
  const blocked = limiters.map(({ limiter, key }) => limiter.peek(key)).find((decision) => !decision.allowed);
  if (blocked) return blocked;
  for (const { limiter, key } of limiters) limiter.record(key);
  return { allowed: true, retryAfterMs: 0 };
}

export function checkRateLimit(req: Request, route: RateLimitedRoute): RateLimitDecision {
  const limiters = limitersFromEnv();
  return checkLimits([
    { limiter: limiters.routes[route], key: clientKey(req) },
    { limiter: limiters.global, key: GLOBAL_KEY },
  ]);
}
