import { describe, expect, it } from "vitest";
import { enabledProviders } from "@/modules/identity/auth/oauth-providers";
import { loadApiEnv } from "@/config";

const base = { DATABASE_URL: "postgres://u:p@127.0.0.1:5432/x", OPEN_METEO_GEOCODING_URL: "https://geocoding-api.open-meteo.com/v1/search", OPEN_METEO_FORECAST_URL: "https://api.open-meteo.com/v1/forecast" };

describe("enabledProviders", () => {
  it("is empty without OAuth keys", () => {
    expect(enabledProviders(loadApiEnv(base))).toEqual([]);
  });

  it("enables GitHub only when both GitHub keys are set", () => {
    expect(enabledProviders(loadApiEnv({ ...base, GITHUB_CLIENT_ID: "id" }))).toEqual([]);
    expect(enabledProviders(loadApiEnv({ ...base, GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" }))).toEqual(["github"]);
  });

  it("enables Google only when both Google keys are set", () => {
    expect(enabledProviders(loadApiEnv({ ...base, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }))).toEqual(["google"]);
  });

  it("lists both providers in a stable order", () => {
    const env = loadApiEnv({ ...base, GOOGLE_CLIENT_ID: "g", GOOGLE_CLIENT_SECRET: "gs", GITHUB_CLIENT_ID: "h", GITHUB_CLIENT_SECRET: "hs" });
    expect(enabledProviders(env)).toEqual(["github", "google"]);
  });
});
