import { describe, expect, it } from "vitest";
import { loadApiEnv } from "@/config";
import { createOAuthRuntime, githubIdentity, googleIdentity } from "@/modules/identity/auth/passport-strategies";

const base = { DATABASE_URL: "postgres://u:p@127.0.0.1:5432/x", OPEN_METEO_GEOCODING_URL: "https://geocoding-api.open-meteo.com/v1/search", OPEN_METEO_FORECAST_URL: "https://api.open-meteo.com/v1/forecast" };
const origin = { PUBLIC_APP_ORIGIN: "https://agri-agent-m.vercel.app" };

describe("provider profile mapping", () => {
  it("maps a GitHub user to a stable identity, falling back to the login as name", () => {
    expect(githubIdentity({ id: 42, name: "Ann", login: "ann", avatar_url: "https://a.example/42" })).toEqual({ providerUserId: "42", displayName: "Ann", avatarUrl: "https://a.example/42" });
    expect(githubIdentity({ id: 7, name: null, login: "bob", avatar_url: null })).toEqual({ providerUserId: "7", displayName: "bob", avatarUrl: null });
  });

  it("maps a Google profile to a stable identity", () => {
    expect(googleIdentity({ id: "g-1", displayName: "Ann", photos: [{ value: "https://p.example/1" }] })).toEqual({ providerUserId: "g-1", displayName: "Ann", avatarUrl: "https://p.example/1" });
    expect(googleIdentity({ id: "g-2", displayName: "", photos: [] })).toEqual({ providerUserId: "g-2", displayName: null, avatarUrl: null });
  });
});

describe("identity validation", () => {
  it("refuses a GitHub response without a numeric id instead of inventing an identity", () => {
    expect(githubIdentity({ message: "Bad credentials" } as Parameters<typeof githubIdentity>[0])).toBeUndefined();
    expect(githubIdentity({ id: "42", login: "ann" })).toBeUndefined();
  });

  it("refuses a Google profile without a string id", () => {
    expect(googleIdentity({ displayName: "Ann" })).toBeUndefined();
    expect(googleIdentity({ id: "", displayName: "Ann" })).toBeUndefined();
  });
});

describe("OAuth runtime", () => {
  it("enables a provider only with its keys and a public origin", () => {
    expect(createOAuthRuntime(loadApiEnv({ ...base, ...origin, GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "s" })).providers).toEqual(["github"]);
    expect(createOAuthRuntime(loadApiEnv({ ...base, GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "s" })).providers).toEqual([]);
    expect(createOAuthRuntime(loadApiEnv({ ...base, ...origin })).providers).toEqual([]);
  });
});
