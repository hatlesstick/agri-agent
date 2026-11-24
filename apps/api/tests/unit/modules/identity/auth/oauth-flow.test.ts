import { describe, expect, it } from "vitest";
import { createOAuthState, decodeFlowCookie, encodeFlowCookie, safeReturnPath, sameValue } from "@/modules/identity/auth/oauth-flow";

describe("oauth flow helpers", () => {
  it("creates random 43-character state values", () => {
    expect(createOAuthState()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createOAuthState()).not.toBe(createOAuthState());
  });

  it("keeps only same-origin relative return paths", () => {
    expect(safeReturnPath("/chat?tab=2")).toBe("/chat?tab=2");
    expect(safeReturnPath("https://evil.example")).toBe("/");
    expect(safeReturnPath("//evil.example")).toBe("/");
    expect(safeReturnPath("/\\evil.example")).toBe("/");
    expect(safeReturnPath("/ok\nset-cookie: x")).toBe("/");
    expect(safeReturnPath("")).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
  });

  it("round-trips the flow cookie and rejects a damaged one", () => {
    const value = encodeFlowCookie({ provider: "github", state: "s", codeVerifier: "v", returnTo: "/chat" });
    expect(decodeFlowCookie(value)).toEqual({ provider: "github", state: "s", codeVerifier: "v", returnTo: "/chat" });
    expect(decodeFlowCookie("not-json")).toBeUndefined();
    expect(decodeFlowCookie(undefined)).toBeUndefined();
  });

  it("compares secrets in constant time and rejects different lengths", () => {
    expect(sameValue("abc", "abc")).toBe(true);
    expect(sameValue("abc", "abd")).toBe(false);
    expect(sameValue("abc", "abcd")).toBe(false);
  });
});
