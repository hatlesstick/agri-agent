import { describe, expect, it } from "vitest";
import { createRateLimiters } from "@/common/rate-limit";
import type { RateLimiter, RateLimiterOptions } from "@/common/rate-limit/rate-limit";

function recordingFactory() {
  const limits: number[] = [];
  const create = (options: RateLimiterOptions): RateLimiter => {
    limits.push(options.limit);
    return {} as RateLimiter;
  };
  return { limits, create };
}

describe("createRateLimiters", () => {
  it("gives session routes their own limit, separate from chat", () => {
    const { limits, create } = recordingFactory();
    const limiters = createRateLimiters({ perClientPerMinute: 10, sessionPerClientPerMinute: 60, globalPerMinute: 300 }, create);
    expect(limiters.routes.chat).toBeDefined();
    expect(limits).toEqual([300, 10, 10, 60]);
  });
});
