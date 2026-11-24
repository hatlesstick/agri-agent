export type OAuthProvider = "github" | "google";

export type OAuthCredentials = { clientId: string; clientSecret: string };

export type ProviderIdentity = { providerUserId: string; displayName: string | null; avatarUrl: string | null };

export type FlowState = { provider: OAuthProvider; state: string; codeVerifier: string; returnTo: string };

export type OAuthOutcome = { ok: true; sessionToken: string; returnTo: string } | { ok: false; code: "cancelled" | "state_mismatch" | "provider_error" };
