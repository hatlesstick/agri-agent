import { describe, expect, it } from "vitest";
import { loadApiEnv } from "@/config";

const BASE = {
  OPEN_METEO_GEOCODING_URL: "https://geocoding-api.open-meteo.com/v1/search",
  OPEN_METEO_FORECAST_URL: "https://api.open-meteo.com/v1/forecast",
};

describe("loadApiEnv", () => {
  it("applies defaults for the API", () => {
    const env = loadApiEnv(BASE);
    expect(env.PORT).toBe(4000);
    expect(env.CACHE_DRIVER).toBe("memory");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.SWAGGER_ENABLED).toBe(false);
  });

  it("requires a proxy secret and proxy hops in production", () => {
    expect(() => loadApiEnv({ ...BASE, NODE_ENV: "production", TRUSTED_PROXY_HOPS: "1" })).toThrow(/PROXY_AUTH_SECRET/);
    expect(() => loadApiEnv({ ...BASE, NODE_ENV: "production", PROXY_AUTH_SECRET: "x".repeat(32) })).toThrow(/TRUSTED_PROXY_HOPS/);
    expect(loadApiEnv({ ...BASE, NODE_ENV: "production", TRUSTED_PROXY_HOPS: "1", PROXY_AUTH_SECRET: "x".repeat(32), AI_MOCK: "1" }).PORT).toBe(4000);
  });

  it("rejects a short proxy secret and a Redis driver without a URL", () => {
    expect(() => loadApiEnv({ ...BASE, PROXY_AUTH_SECRET: "short" })).toThrow(/PROXY_AUTH_SECRET/);
    expect(() => loadApiEnv({ ...BASE, CACHE_DRIVER: "redis" })).toThrow(/REDIS_URL/);
  });

  it("requires the AI Gateway key in production unless the mock model is used", () => {
    const production = { ...BASE, NODE_ENV: "production", TRUSTED_PROXY_HOPS: "1", PROXY_AUTH_SECRET: "x".repeat(32) };
    expect(() => loadApiEnv(production)).toThrow(/AI_GATEWAY_API_KEY/);
    expect(loadApiEnv({ ...production, AI_GATEWAY_API_KEY: "gw-key" }).AI_GATEWAY_API_KEY).toBe("gw-key");
    expect(loadApiEnv({ ...production, AI_MOCK: "1" }).AI_MOCK).toBe(true);
  });
});
