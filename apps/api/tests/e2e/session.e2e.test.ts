import type { NestExpressApplication } from "@nestjs/platform-express";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CLOCK } from "@/common/clock";
import { DATABASE } from "@/database";
import { sessions, users } from "@/database/schema";
import { testApp } from "@tests/support/create-test-app";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

const SECRET = "s".repeat(32);
const COOKIE_NAME = "__Host-agri_session";
const START = new Date("2026-11-24T08:00:00.000Z");
const HOUR = 60 * 60 * 1000;

type Overrides = { now: Date; rateLimitPerMinute?: string };

describe("GET /session", () => {
  let test: TestDatabase;
  let app: NestExpressApplication;
  let now: Date;

  beforeEach(async () => {
    test = await testDatabase();
    await test.reset();
    now = START;
  });

  afterEach(async () => {
    await app?.close();
    await test.close();
  });

  async function start({ now: initial, rateLimitPerMinute }: Overrides): Promise<void> {
    now = initial;
    app = await testApp([{ token: DATABASE, useValue: databaseHandle(test.db) }, { token: CLOCK, useValue: () => now }], {
      PROXY_AUTH_SECRET: SECRET,
      ...(rateLimitPerMinute ? { SESSION_RATE_LIMIT_PER_MINUTE: rateLimitPerMinute } : {}),
    });
  }

  const session = (cookie?: string) => {
    const call = request(app.getHttpServer()).get("/session").set("x-proxy-auth", SECRET);
    return cookie ? call.set("Cookie", cookie) : call;
  };

  const cookieFrom = (setCookie: string[] | string | undefined): string | undefined => {
    const header = Array.isArray(setCookie) ? setCookie.find((value) => value.startsWith(COOKIE_NAME)) : setCookie;
    return header?.split(";")[0];
  };

  const counts = async () => ({ users: await test.db.$count(users), sessions: await test.db.$count(sessions) });

  it("creates a user and sets a host-only cookie on the first visit", async () => {
    await start({ now: START });
    const response = await session();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: expect.any(String), createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) });
    const cookie = [response.headers["set-cookie"]].flat().find((value) => value.startsWith(COOKIE_NAME)) ?? "";
    expect(cookie).toMatch(/^__Host-agri_session=[A-Za-z0-9_-]{43};/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=34560000");
    expect(cookie).not.toMatch(/Domain=/i);
  });

  it("stores only the hash of the token", async () => {
    await start({ now: START });
    const response = await session();
    const token = cookieFrom(response.headers["set-cookie"])?.slice(`${COOKIE_NAME}=`.length) ?? "";
    const [row] = await test.db.select().from(sessions);
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps the same user on the next request the same day without a new cookie", async () => {
    await start({ now: START });
    const first = await session();
    const cookie = cookieFrom(first.headers["set-cookie"]) ?? "";
    const second = await session(cookie);
    expect(second.body.userId).toBe(first.body.userId);
    expect(second.headers["set-cookie"]).toBeUndefined();
  });

  it("keeps the user and re-sets the cookie once a day has passed", async () => {
    await start({ now: START });
    const first = await session();
    const cookie = cookieFrom(first.headers["set-cookie"]) ?? "";
    now = new Date(START.getTime() + 25 * HOUR);
    const later = await session(cookie);
    expect(later.body.userId).toBe(first.body.userId);
    expect(cookieFrom(later.headers["set-cookie"])).toBe(cookie);
  });

  it("gives a tampered cookie a fresh user", async () => {
    await start({ now: START });
    const first = await session();
    const cookie = cookieFrom(first.headers["set-cookie"]) ?? "";
    const tampered = await session(`${cookie}x`);
    expect(tampered.status).toBe(200);
    expect(tampered.body.userId).not.toBe(first.body.userId);
    expect(cookieFrom(tampered.headers["set-cookie"])).toBeDefined();
  });

  it("gives two cookie-less browsers different users", async () => {
    await start({ now: START });
    const first = await session();
    const second = await session();
    expect(second.body.userId).not.toBe(first.body.userId);
  });

  it("answers 403 without the proxy secret and creates no rows", async () => {
    await start({ now: START });
    const before = await counts();
    const response = await request(app.getHttpServer()).get("/session");
    expect(response.status).toBe(403);
    expect(await counts()).toEqual(before);
  });

  it("answers 429 over the rate limit and creates no rows", async () => {
    await start({ now: START, rateLimitPerMinute: "1" });
    await session();
    const before = await counts();
    const response = await session();
    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({ code: "rate_limited" });
    expect(await counts()).toEqual(before);
  });

  it("gives a new user when the old user was deleted while the cookie stayed", async () => {
    await start({ now: START });
    const first = await session();
    const cookie = cookieFrom(first.headers["set-cookie"]) ?? "";
    await test.db.delete(users).where(eq(users.id, first.body.userId));
    const next = await session(cookie);
    expect(next.status).toBe(200);
    expect(next.body.userId).not.toBe(first.body.userId);
  });

  it("documents the endpoint in OpenAPI", async () => {
    await start({ now: START });
    const document = (await request(app.getHttpServer()).get("/openapi.json")).body;
    expect(document.paths["/session"].get.responses["200"]).toBeDefined();
    expect(document.paths["/session"].get.responses["403"]).toBeDefined();
    expect(document.paths["/session"].get.responses["429"]).toBeDefined();
  });
});
