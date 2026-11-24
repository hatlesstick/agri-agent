import type { ApiEnv } from "@/config";
import type { OAuthCredentials, OAuthProvider } from "@/modules/identity/auth/auth.types";

export function providerCredentials(env: ApiEnv, provider: OAuthProvider): OAuthCredentials | undefined {
  const clientId = provider === "github" ? env.GITHUB_CLIENT_ID : env.GOOGLE_CLIENT_ID;
  const clientSecret = provider === "github" ? env.GITHUB_CLIENT_SECRET : env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

export function enabledProviders(env: ApiEnv): OAuthProvider[] {
  return (["github", "google"] as const).filter((provider) => providerCredentials(env, provider) !== undefined);
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "github" || value === "google";
}
