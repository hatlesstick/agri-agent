import { describe, expect, it } from "vitest";
import { FlowStateStore } from "@/modules/identity/auth/FlowStateStore";
import { decodeFlowCookie, encodeFlowCookie, OAUTH_FLOW_COOKIE } from "@/modules/identity/auth/oauth-flow";

function fakeReq(cookie: string | undefined, query: Record<string, unknown> = {}) {
  const set: Array<{ name: string; value: string }> = [];
  const res = { cookie: (name: string, value: string) => set.push({ name, value }) };
  return { req: { headers: { cookie }, query, res } as never, set };
}

describe("FlowStateStore", () => {
  it("writes the verifier and a safe return path into the flow cookie and returns the state", () => {
    const store = new FlowStateStore("github");
    const { req, set } = fakeReq(undefined, { returnTo: "/chat" });
    let issued: string | undefined;
    store.store(req as never, "verifier-1", undefined, {}, (error, state) => {
      expect(error).toBeNull();
      issued = state;
    });
    expect(issued).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(set).toHaveLength(1);
    expect(set[0].name).toBe(OAUTH_FLOW_COOKIE);
    expect(decodeFlowCookie(set[0].value)).toEqual({ provider: "github", state: issued, codeVerifier: "verifier-1", returnTo: "/chat" });
  });

  it("falls back to / when the return path is unsafe", () => {
    const store = new FlowStateStore("google");
    const { req, set } = fakeReq(undefined, { returnTo: "https://evil.example" });
    store.store(req as never, "v", undefined, {}, () => {});
    expect(decodeFlowCookie(set[0].value)?.returnTo).toBe("/");
  });

  it("verifies a matching state and hands back the verifier and return path", () => {
    const cookie = encodeFlowCookie({ provider: "github", state: "s-1", codeVerifier: "v-1", returnTo: "/chat" });
    const store = new FlowStateStore("github");
    const { req } = fakeReq(`${OAUTH_FLOW_COOKIE}=${cookie}`);
    let result: unknown[] = [];
    store.verify(req as never, "s-1", {}, (...args: unknown[]) => {
      result = args;
    });
    expect(result).toEqual([null, "v-1", "/chat"]);
  });

  it("rejects a different state, a missing cookie, a state of another provider and a missing state", () => {
    const cookie = encodeFlowCookie({ provider: "github", state: "s-1", codeVerifier: "v-1", returnTo: "/" });
    const cases = [
      fakeReq(`${OAUTH_FLOW_COOKIE}=${cookie}`).req,
      fakeReq(undefined).req,
    ];
    const store = new FlowStateStore("github");
    const outcomes: unknown[] = [];
    store.verify(cases[0] as never, "other", {}, (_error: unknown, ok: unknown) => outcomes.push(ok));
    store.verify(cases[1] as never, "s-1", {}, (_error: unknown, ok: unknown) => outcomes.push(ok));
    store.verify(cases[0] as never, undefined as never, {}, (_error: unknown, ok: unknown) => outcomes.push(ok));
    const other = new FlowStateStore("google");
    other.verify(cases[0] as never, "s-1", {}, (_error: unknown, ok: unknown) => outcomes.push(ok));
    expect(outcomes).toEqual([false, false, false, false]);
  });
});
