export type SignInProvider = "github" | "google";

const LABELS: Record<SignInProvider, string> = {
  github: "Sign in with GitHub",
  google: "Sign in with Google",
};

const AUTH_ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled.",
  state_mismatch: "Sign-in expired. Please try again.",
  provider_error: "The sign-in provider did not respond. Please try again.",
};

export function signInLabel(provider: SignInProvider): string {
  return LABELS[provider];
}

export function signInHref(provider: SignInProvider, returnTo: string): string {
  return `/api/auth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`;
}

export function authErrorMessage(code: string | null): string | undefined {
  if (!code) return undefined;
  return AUTH_ERRORS[code] ?? "Sign-in failed. Please try again.";
}
