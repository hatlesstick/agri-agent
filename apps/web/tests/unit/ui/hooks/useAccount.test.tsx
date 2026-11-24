import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAccount } from "@/ui/hooks/useAccount";

function jsonResponse(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), { status: ok ? 200 : 500, headers: { "content-type": "application/json" } });
}

describe("useAccount", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("loads the visitor and the configured providers", async () => {
    vi.stubGlobal("fetch", vi.fn(async (path: string) => (path === "/api/me" ? jsonResponse({ userId: "u", displayName: null, avatarUrl: null, providers: ["web"], signedIn: false }) : jsonResponse({ providers: ["github"] }))));
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.providers).toEqual(["github"]));
    expect(result.current.me?.signedIn).toBe(false);
    expect(result.current.authError).toBeUndefined();
  });

  it("reads a sign-in error from the URL and keeps the page path as the return path", async () => {
    window.history.replaceState({}, "", "/chat?auth_error=cancelled");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ providers: [] }, false)));
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.authError).toBe("Sign-in was cancelled."));
    expect(result.current.returnTo).toBe("/chat");
  });

  it("signs out and then reloads the visitor", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (path: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${path}`);
      return path === "/api/me" ? jsonResponse({ userId: "u", displayName: null, avatarUrl: null, providers: ["web"], signedIn: false }) : jsonResponse({ providers: [] });
    }));
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.me).not.toBeNull());
    await act(() => result.current.signOut());
    expect(calls).toContain("POST /api/auth/sign-out");
    expect(calls.filter((call) => call === "GET /api/me")).toHaveLength(2);
  });
});
