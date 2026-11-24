import { randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { FlowState } from "@/modules/identity/auth/auth.types";

const flowSchema = z.object({
  provider: z.enum(["github", "google"]),
  state: z.string(),
  codeVerifier: z.string(),
  returnTo: z.string(),
});

export const OAUTH_FLOW_COOKIE = "__Host-agri_oauth";

export const oauthFlowCookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 10 * 60 * 1000 };

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
}

export function safeReturnPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || hasControlCharacter(raw)) return "/";
  return raw;
}

export function encodeFlowCookie(flow: FlowState): string {
  return Buffer.from(JSON.stringify(flow)).toString("base64url");
}

export function decodeFlowCookie(value: string | undefined): FlowState | undefined {
  if (!value) return undefined;
  try {
    const parsed = flowSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function sameValue(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
