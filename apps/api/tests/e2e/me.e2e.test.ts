import type { NestExpressApplication } from "@nestjs/platform-express";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DATABASE } from "@/database";
import { identities, sessions } from "@/database/schema";
import { OAUTH_RUNTIME } from "@/modules/identity/auth/auth.tokens";
import { FlowStateStore } from "@/modules/identity/auth/FlowStateStore";
import { OAUTH_FLOW_COOKIE } from "@/modules/identity/auth/oauth-flow";
import { ORIGIN, cookieValue, runtimeWithStub } from "@tests/support/oauth-stub";
import { testApp } from "@tests/support/create-test-app";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

describe("GET /me and POST /auth/sign-out", () => {
  let test: TestDatabase;
  let app: NestExpressApplication;

  beforeEach(async () => {
    test = await testDatabase();
    await test.reset();
    app = await testApp([{ token: DATABASE, useValue: databaseHandle(test.db) }, { token: OAUTH_RUNTIME, useValue: runtimeWithStub(new FlowStateStore("github")) }], { PUBLIC_APP_ORIGIN: ORIGIN });
  });

  afterEach(async () => {
    await app.close();
    await test.close();
  });

  const http = () => request(app.getHttpServer());

  async function signIn(sessionCookie: string): Promise<string> {
    const start = await http().get("/auth/github/start").set("Cookie", sessionCookie);
    const flow = cookieValue(start.headers["set-cookie"], OAUTH_FLOW_COOKIE) ?? "";
    const state = new URL(start.headers.location).searchParams.get("state") ?? "";
    const done = await http().get("/auth/github/callback").query({ code: "ok", state }).set("Cookie", [flow, sessionCookie].join("; "));
    return cookieValue(done.headers["set-cookie"], "__Host-agri_session") ?? "";
  }

  it("describes an anonymous visitor as not signed in", async () => {
    const first = await http().get("/session");
    const cookie = cookieValue(first.headers["set-cookie"], "__Host-agri_session") ?? "";
    const response = await http().get("/me").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: first.body.userId, displayName: null, avatarUrl: null, providers: ["web"], signedIn: false });
  });

  it("describes a signed-in user with the provider profile", async () => {
    const anonymous = cookieValue((await http().get("/session")).headers["set-cookie"], "__Host-agri_session") ?? "";
    const signedIn = await signIn(anonymous);
    const response = await http().get("/me").set("Cookie", signedIn);
    expect(response.body).toEqual({ userId: expect.any(String), displayName: "Ann", avatarUrl: "https://a.example/42", providers: expect.arrayContaining(["web", "github"]), signedIn: true });
  });

  it("signs out: deletes the session, expires the cookie, and the next visit is a new anonymous user", async () => {
    const anonymous = cookieValue((await http().get("/session")).headers["set-cookie"], "__Host-agri_session") ?? "";
    const signedIn = await signIn(anonymous);
    const before = await http().get("/me").set("Cookie", signedIn);
    const out = await http().post("/auth/sign-out").set("Cookie", signedIn);
    expect(out.status).toBe(204);
    expect([out.headers["set-cookie"]].flat().some((value) => value.startsWith("__Host-agri_session=;"))).toBe(true);
    const next = await http().get("/me").set("Cookie", signedIn);
    expect(next.body.signedIn).toBe(false);
    expect(next.body.userId).not.toBe(before.body.userId);
    expect(await test.db.$count(sessions)).toBeGreaterThan(0);
  });

  it("leaves another browser signed in after sign-out", async () => {
    const first = cookieValue((await http().get("/session")).headers["set-cookie"], "__Host-agri_session") ?? "";
    const firstSigned = await signIn(first);
    const second = cookieValue((await http().get("/session")).headers["set-cookie"], "__Host-agri_session") ?? "";
    const secondSigned = await signIn(second);
    await http().post("/auth/sign-out").set("Cookie", firstSigned);
    const stillIn = await http().get("/me").set("Cookie", secondSigned);
    expect(stillIn.body.signedIn).toBe(true);
    expect(await test.db.$count(identities, eq(identities.provider, "github"))).toBe(1);
  });
});
