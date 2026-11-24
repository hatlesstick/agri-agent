import type { NestExpressApplication } from "@nestjs/platform-express";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import { Passport } from "passport";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DATABASE } from "@/database";
import { identities, users } from "@/database/schema";
import { OAUTH_RUNTIME } from "@/modules/identity/auth/auth.tokens";
import { OAUTH_FLOW_COOKIE } from "@/modules/identity/auth/oauth-flow";
import { FlowStateStore } from "@/modules/identity/auth/FlowStateStore";
import type { OAuthRuntime } from "@/modules/identity/auth/passport-strategies";
import { testApp } from "@tests/support/create-test-app";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

const ORIGIN = "https://agri-agent-m.vercel.app";

function providerStub(store: FlowStateStore) {
  return {
    name: "github",
    authenticate(this: Record<string, (...args: unknown[]) => void>, req: Request) {
      if (req.path.endsWith("/start")) {
        store.store(req, "verifier-stub", undefined, {}, (error, state) => (error ? this.error(error) : this.redirect(`https://github.com/login/oauth/authorize?state=${state}`)));
        return;
      }
      store.verify(req, req.query.state as string | undefined, {}, (error, ok) => {
        if (error) return this.error(error);
        if (!ok) return this.fail(403);
        if (req.query.code === "bad") return this.error(new Error("exchange failed"));
        this.success({ providerUserId: "42", displayName: "Ann", avatarUrl: null });
      });
    },
  };
}

function runtimeWithStub(): OAuthRuntime {
  const passport = new Passport();
  passport.use("github", providerStub(new FlowStateStore("github")) as never);
  return { passport, providers: ["github"] };
}

function cookieValue(setCookie: string[] | string | undefined, name: string): string | undefined {
  return [setCookie ?? []].flat().find((value) => value.startsWith(`${name}=`))?.split(";")[0];
}

describe("OAuth sign-in", () => {
  let test: TestDatabase;
  let app: NestExpressApplication;

  beforeEach(async () => {
    test = await testDatabase();
    await test.reset();
    app = await testApp([{ token: DATABASE, useValue: databaseHandle(test.db) }, { token: OAUTH_RUNTIME, useValue: runtimeWithStub() }], { PUBLIC_APP_ORIGIN: ORIGIN });
  });

  afterEach(async () => {
    await app.close();
    await test.close();
  });

  const http = () => request(app.getHttpServer());

  async function visitor(): Promise<string> {
    const response = await http().get("/session").set("x-proxy-auth", "");
    return cookieValue(response.headers["set-cookie"], "__Host-agri_session") ?? "";
  }

  async function start(sessionCookie: string | undefined, returnTo?: string) {
    const path = returnTo === undefined ? "/auth/github/start" : `/auth/github/start?returnTo=${encodeURIComponent(returnTo)}`;
    const call = http().get(path);
    const response = await (sessionCookie ? call.set("Cookie", sessionCookie) : call);
    const flow = cookieValue(response.headers["set-cookie"], OAUTH_FLOW_COOKIE) ?? "";
    const state = new URL(response.headers.location).searchParams.get("state") ?? "";
    return { response, flow, state };
  }

  async function callback(flow: string, query: Record<string, string>, sessionCookie?: string) {
    const cookies = [flow, sessionCookie].filter(Boolean).join("; ");
    return http().get("/auth/github/callback").query(query).set("Cookie", cookies);
  }

  it("redirects to the provider with a host-only, short-lived flow cookie", async () => {
    const { response, flow } = await start(undefined);
    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?state=/);
    expect(flow).toMatch(new RegExp(`^${OAUTH_FLOW_COOKIE}=`));
    const cookie = [response.headers["set-cookie"]].flat().find((value) => value.startsWith(OAUTH_FLOW_COOKIE)) ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toMatch(/Domain=/i);
  });

  it("answers 404 for a provider that is not configured", async () => {
    expect((await http().get("/auth/google/start")).status).toBe(404);
  });

  it("attaches the identity to the anonymous visitor and keeps the same user", async () => {
    const anonymous = await visitor();
    const before = await http().get("/session").set("Cookie", anonymous);
    const { flow, state } = await start(anonymous, "/chat");
    const response = await callback(flow, { code: "ok", state }, anonymous);
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${ORIGIN}/chat`);
    const signedIn = cookieValue(response.headers["set-cookie"], "__Host-agri_session") ?? "";
    const after = await http().get("/session").set("Cookie", signedIn);
    expect(after.body.userId).toBe(before.body.userId);
    const [github] = await test.db.select().from(identities).where(eq(identities.provider, "github"));
    expect(github).toMatchObject({ userId: before.body.userId, externalId: "42" });
  });

  it("switches to the user who already owns the identity and leaves the anonymous user alone", async () => {
    const first = await visitor();
    const owner = await start(first);
    const ownerResponse = await callback(owner.flow, { code: "ok", state: owner.state }, first);
    const ownerSession = cookieValue(ownerResponse.headers["set-cookie"], "__Host-agri_session");
    const ownerRecord = await http().get("/session").set("Cookie", ownerSession ?? "");
    const second = await visitor();
    const later = await start(second);
    const response = await callback(later.flow, { code: "ok", state: later.state }, second);
    const switched = cookieValue(response.headers["set-cookie"], "__Host-agri_session") ?? "";
    const after = await http().get("/session").set("Cookie", switched);
    expect(after.body.userId).toBe(ownerRecord.body.userId);
    expect(await test.db.$count(identities, eq(identities.provider, "github"))).toBe(1);
    expect(await test.db.$count(users)).toBe(2);
  });

  it("rejects a state that does not match the flow cookie", async () => {
    const { flow } = await start(undefined);
    const response = await callback(flow, { code: "ok", state: "forged" });
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${ORIGIN}/?auth_error=state_mismatch`);
    expect(await test.db.$count(identities, eq(identities.provider, "github"))).toBe(0);
  });

  it("rejects a callback without the flow cookie", async () => {
    const { state } = await start(undefined);
    const response = await http().get("/auth/github/callback").query({ code: "ok", state });
    expect(response.headers.location).toBe(`${ORIGIN}/?auth_error=state_mismatch`);
  });

  it("reports a user who cancelled at the provider as cancelled", async () => {
    const { flow, state } = await start(undefined);
    const response = await callback(flow, { error: "access_denied", state });
    expect(response.headers.location).toBe(`${ORIGIN}/?auth_error=cancelled`);
    expect(await test.db.$count(identities, eq(identities.provider, "github"))).toBe(0);
  });

  it("reports a failed token exchange as a provider error and leaves no identity", async () => {
    const { flow, state } = await start(undefined);
    const response = await callback(flow, { code: "bad", state });
    expect(response.headers.location).toBe(`${ORIGIN}/?auth_error=provider_error`);
    expect(await test.db.$count(identities, eq(identities.provider, "github"))).toBe(0);
  });

  it("sends an unsafe return path to the home page", async () => {
    const anonymous = await visitor();
    const { flow, state } = await start(anonymous, "https://evil.example");
    const response = await callback(flow, { code: "ok", state }, anonymous);
    expect(response.headers.location).toBe(`${ORIGIN}/`);
  });

  it("clears the flow cookie on every callback outcome", async () => {
    const { flow, state } = await start(undefined);
    const response = await callback(flow, { error: "access_denied", state });
    expect([response.headers["set-cookie"]].flat().some((value) => value.startsWith(`${OAUTH_FLOW_COOKIE}=;`))).toBe(true);
  });
});
