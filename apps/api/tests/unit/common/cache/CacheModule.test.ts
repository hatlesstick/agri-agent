import { describe, expect, it } from "vitest";
import { createCacheStore, InMemoryCacheStore } from "@/common/cache";
import { loadApiEnv } from "@/config";

const BASE = {
  OPEN_METEO_GEOCODING_URL: "https://geocoding-api.open-meteo.com/v1/search",
  OPEN_METEO_FORECAST_URL: "https://api.open-meteo.com/v1/forecast",
  DATABASE_URL: "postgres://agri:agri@127.0.0.1:5432/agri",
};

describe("createCacheStore", () => {
  it("uses the in-memory store by default", () => {
    expect(createCacheStore(loadApiEnv(BASE))).toBeInstanceOf(InMemoryCacheStore);
  });

  it("fails fast for the Redis driver until its adapter exists", () => {
    expect(() => createCacheStore(loadApiEnv({ ...BASE, CACHE_DRIVER: "redis", REDIS_URL: "redis://localhost:6379" }))).toThrow(/not implemented/);
  });
});
