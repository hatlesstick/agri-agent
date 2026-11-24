import type { ApiEnv } from "@/config";

export type OAuthProvider = "github" | "google";

export function enabledProviders(env: ApiEnv): OAuthProvider[] {
  const providers: OAuthProvider[] = [];
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) providers.push("github");
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.push("google");
  return providers;
}
