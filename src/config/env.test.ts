import { afterEach, describe, expect, it, vi } from "vitest";
import { serverEnv } from "@/config/env";

describe("serverEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reads Open-Meteo URLs and mock flag from the environment", () => {
    vi.stubEnv("OPEN_METEO_GEOCODING_URL", "https://geo.example.com/v1/search");
    vi.stubEnv("OPEN_METEO_FORECAST_URL", "https://api.example.com/v1/forecast");
    vi.stubEnv("AI_MOCK", "1");
    expect(serverEnv()).toMatchObject({
      OPEN_METEO_GEOCODING_URL: "https://geo.example.com/v1/search",
      OPEN_METEO_FORECAST_URL: "https://api.example.com/v1/forecast",
      AI_MOCK: true,
    });
  });

  it("treats a missing mock flag as disabled", () => {
    vi.stubEnv("AI_MOCK", undefined);
    expect(serverEnv().AI_MOCK).toBe(false);
  });

  it("fails fast when a URL is missing", () => {
    vi.stubEnv("OPEN_METEO_FORECAST_URL", undefined);
    expect(() => serverEnv()).toThrow(/OPEN_METEO_FORECAST_URL/);
  });

  it("rejects non-https URLs", () => {
    vi.stubEnv("OPEN_METEO_GEOCODING_URL", "http://geo.example.com/v1/search");
    expect(() => serverEnv()).toThrow(/OPEN_METEO_GEOCODING_URL/);
  });

  it("rejects an unexpected mock flag value", () => {
    vi.stubEnv("AI_MOCK", "yes");
    expect(() => serverEnv()).toThrow(/AI_MOCK/);
  });
});
