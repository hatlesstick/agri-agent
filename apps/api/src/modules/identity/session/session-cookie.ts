import { SESSION_COOKIE, SESSION_TTL_MS } from "@/modules/identity/session/session.constants";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS,
};

export function readSessionCookie(header: string | undefined): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    return part.slice(separator + 1).trim() || undefined;
  }
  return undefined;
}
