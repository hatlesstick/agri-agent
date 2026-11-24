import { describe, expect, it } from "vitest";
import { readSessionCookie, sessionCookieOptions } from "@/modules/identity/session/session-cookie";
import { SESSION_TTL_MS } from "@/modules/identity/session/session.constants";

describe("readSessionCookie", () => {
  it("reads the session cookie among other cookies", () => {
    expect(readSessionCookie("theme=dark; __Host-agri_session=abc123; lang=uk")).toBe("abc123");
  });

  it("returns undefined when the cookie is absent or empty", () => {
    expect(readSessionCookie(undefined)).toBeUndefined();
    expect(readSessionCookie("theme=dark")).toBeUndefined();
    expect(readSessionCookie("__Host-agri_session=")).toBeUndefined();
  });

  it("does not match a cookie whose name only contains the session name", () => {
    expect(readSessionCookie("x__Host-agri_session=abc")).toBeUndefined();
  });
});

describe("sessionCookieOptions", () => {
  it("is HttpOnly, Secure, Lax, host-only and lasts the session TTL", () => {
    expect(sessionCookieOptions).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL_MS });
  });
});
