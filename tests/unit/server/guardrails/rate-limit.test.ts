import { afterEach, describe, expect, it, vi } from "vitest";

const request = () => new Request("https://agri-agent.test/api/chat", { method: "POST" });

describe("rate-limit module and server env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("can be imported without a valid production env, so next build does not need runtime settings", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    vi.resetModules();

    await expect(import("@/server/guardrails/rate-limit")).resolves.toBeDefined();
  });

  it("still fails fast on the first request when the production env is invalid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    vi.resetModules();

    const { checkRateLimit } = await import("@/server/guardrails/rate-limit");

    expect(() => checkRateLimit(request(), "chat")).toThrow(/TRUSTED_PROXY_HOPS/);
  });

  it("reads limits from env when the first request arrives", async () => {
    vi.stubEnv("RATE_LIMIT_PER_MINUTE", "1");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
    vi.resetModules();

    const { checkRateLimit } = await import("@/server/guardrails/rate-limit");

    expect(checkRateLimit(request(), "chat").allowed).toBe(true);
    expect(checkRateLimit(request(), "chat").allowed).toBe(false);
  });
});
