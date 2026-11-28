export type RateLimitDecision = { allowed: boolean; retryAfterMs: number };

export type RateLimiter = {
  peek(key: string): RateLimitDecision;
  record(key: string): void;
  check(key: string): RateLimitDecision;
};

export type RateLimiterOptions = { limit: number; windowMs: number; maxKeys?: number; now?: () => number };

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

export const GLOBAL_KEY = "global";

export function checkLimits(limiters: Array<{ limiter: RateLimiter; key: string }>): RateLimitDecision {
  const blocked = limiters.map(({ limiter, key }) => limiter.peek(key)).find((decision) => !decision.allowed);
  if (blocked) return blocked;
  for (const { limiter, key } of limiters) limiter.record(key);
  return { allowed: true, retryAfterMs: 0 };
}

export type RateLimitedRoute = "chat" | "sprayCheck" | "session";

export type RateLimiters = { global: RateLimiter; routes: Record<RateLimitedRoute, RateLimiter> };

const WINDOW_MS = 60_000;

export function createRateLimiters(
  { perClientPerMinute, sessionPerClientPerMinute, globalPerMinute }: { perClientPerMinute: number; sessionPerClientPerMinute: number; globalPerMinute: number },
  create: (options: RateLimiterOptions) => RateLimiter = createRateLimiter,
): RateLimiters {
  return {
    global: create({ limit: globalPerMinute, windowMs: WINDOW_MS }),
    routes: {
      chat: create({ limit: perClientPerMinute, windowMs: WINDOW_MS }),
      sprayCheck: create({ limit: perClientPerMinute, windowMs: WINDOW_MS }),
      session: create({ limit: sessionPerClientPerMinute, windowMs: WINDOW_MS }),
    },
  };
}
