import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { testApp } from "@tests/support/create-test-app";

const SECRET = "p".repeat(40);
const QUESTION = { question: "What causes spray drift?" };

describe("HTTP guardrails", () => {
  let app: NestExpressApplication;

  afterEach(async () => {
    await app.close();
  });

  it("rejects browser routes without the proxy secret when it is configured", async () => {
    app = await testApp([], { PROXY_AUTH_SECRET: SECRET });
    const denied = await request(app.getHttpServer()).post("/spray-check").send({});
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ code: "forbidden" });
    const allowed = await request(app.getHttpServer()).post("/spray-check").set("x-proxy-auth", SECRET).send({});
    expect(allowed.status).toBe(400);
  });

  it("rate-limits a client with a rate_limited problem and Retry-After", async () => {
    app = await testApp([], { RATE_LIMIT_PER_MINUTE: "2" });
    for (let index = 0; index < 2; index += 1) await request(app.getHttpServer()).post("/spray-check").send({});
    const limited = await request(app.getHttpServer()).post("/spray-check").send(QUESTION);
    expect(limited.status).toBe(429);
    expect(limited.headers["retry-after"]).toMatch(/^\d+$/);
    expect(limited.body).toMatchObject({ code: "rate_limited" });
  });

  it("does not let a forged x-client-ip pick a fresh rate-limit bucket", async () => {
    app = await testApp([], { RATE_LIMIT_PER_MINUTE: "1", PROXY_AUTH_SECRET: SECRET });
    await request(app.getHttpServer()).post("/spray-check").set("x-proxy-auth", "wrong").set("x-client-ip", "198.51.100.1").send({});
    const second = await request(app.getHttpServer()).post("/spray-check").set("x-proxy-auth", SECRET).set("x-client-ip", "198.51.100.2").send({});
    expect(second.status).toBe(400);
    const forged = await request(app.getHttpServer()).post("/spray-check").set("x-proxy-auth", SECRET).set("x-client-ip", "198.51.100.2").send({});
    expect(forged.status).toBe(429);
  });
});
