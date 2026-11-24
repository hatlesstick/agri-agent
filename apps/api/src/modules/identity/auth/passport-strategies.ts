import { Passport } from "passport";
import { Strategy as GoogleStrategy, type Profile as GoogleOAuthProfile, type StrategyOptions as GoogleStrategyOptions, type VerifyCallback as GoogleVerifyCallback } from "passport-google-oauth20";
import { Strategy as OAuth2Strategy, type StrategyOptions } from "passport-oauth2";
import type { ApiEnv } from "@/config";
import type { OAuthProvider, ProviderIdentity } from "@/modules/identity/auth/auth.types";
import { FlowStateStore } from "@/modules/identity/auth/FlowStateStore";
import { enabledProviders, providerCredentials } from "@/modules/identity/auth/oauth-providers";

const createAuthenticator = () => new Passport();

export type OAuthRuntime = { passport: ReturnType<typeof createAuthenticator>; providers: OAuthProvider[] };

type GitHubUser = { id?: unknown; name?: unknown; login?: unknown; avatar_url?: unknown };
type GoogleProfile = { id?: unknown; displayName?: unknown; photos?: Array<{ value?: unknown }> };

const text = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

export function githubIdentity(user: GitHubUser): ProviderIdentity | undefined {
  if (typeof user.id !== "number" || !Number.isSafeInteger(user.id)) return undefined;
  return { providerUserId: String(user.id), displayName: text(user.name) ?? text(user.login), avatarUrl: text(user.avatar_url) };
}

export function googleIdentity(profile: GoogleProfile): ProviderIdentity | undefined {
  const id = text(profile.id);
  if (!id) return undefined;
  return { providerUserId: id, displayName: text(profile.displayName), avatarUrl: text(profile.photos?.[0]?.value) };
}

class GitHubOAuthStrategy extends OAuth2Strategy {
  userProfile(accessToken: string, done: (error: unknown, profile?: unknown) => void): void {
    fetch("https://api.github.com/user", { headers: { accept: "application/vnd.github+json", authorization: `Bearer ${accessToken}`, "user-agent": "agri-agent" } })
      .then(async (response) => (response.ok ? response.json() : Promise.reject(new Error(`GitHub profile request failed: ${response.status}`))))
      .then((profile) => done(null, profile), (error: unknown) => done(error));
  }
}

const ENDPOINTS = {
  github: { authorizationURL: "https://github.com/login/oauth/authorize", tokenURL: "https://github.com/login/oauth/access_token", scope: ["read:user"] },
  google: { authorizationURL: "https://accounts.google.com/o/oauth2/v2/auth", tokenURL: "https://oauth2.googleapis.com/token", scope: ["openid", "profile", "email"] },
} as const;

export function createOAuthRuntime(env: ApiEnv): OAuthRuntime {
  const passport = createAuthenticator();
  const providers: OAuthProvider[] = [];
  const origin = env.PUBLIC_APP_ORIGIN;
  if (!origin) return { passport, providers };
  for (const provider of enabledProviders(env)) {
    const credentials = providerCredentials(env, provider);
    if (!credentials) continue;
    const common = {
      clientID: credentials.clientId,
      clientSecret: credentials.clientSecret,
      callbackURL: `${origin}/api/auth/${provider}/callback`,
      pkce: true,
      store: new FlowStateStore(provider) as unknown as StrategyOptions["store"],
    };
    const endpoint = ENDPOINTS[provider];
    if (provider === "github") {
      passport.use(provider, new GitHubOAuthStrategy({ ...common, authorizationURL: endpoint.authorizationURL, tokenURL: endpoint.tokenURL, scope: [...endpoint.scope] } as StrategyOptions, (_accessToken: string, _refreshToken: string, profile: unknown, done: (error: unknown, user?: unknown) => void) => done(null, githubIdentity(profile as GitHubUser) ?? false)));
    } else {
      passport.use(provider, new GoogleStrategy({ ...common, scope: [...endpoint.scope] } as GoogleStrategyOptions, (_accessToken: string, _refreshToken: string, profile: GoogleOAuthProfile, done: GoogleVerifyCallback) => done(null, googleIdentity(profile as GoogleProfile) ?? false)));
    }
    providers.push(provider);
  }
  return { passport, providers };
}
