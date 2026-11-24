import { describe, expect, it } from "vitest";
import { hashSessionToken, newSessionToken } from "@/modules/identity/session/session-token";

describe("session tokens", () => {
  it("creates 32 random bytes encoded as 43 base64url characters", () => {
    expect(newSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("creates a different token on every call", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => newSessionToken()));
    expect(tokens.size).toBe(50);
  });

  it("hashes a token to 64 hex characters, deterministically", () => {
    const token = newSessionToken();
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("gives different hashes for different tokens and never returns the token itself", () => {
    const token = newSessionToken();
    expect(hashSessionToken(token)).not.toBe(hashSessionToken(newSessionToken()));
    expect(hashSessionToken(token)).not.toContain(token);
  });
});
