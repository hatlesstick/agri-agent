import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { DATABASE } from "@/database";
import { testApp } from "@tests/support/create-test-app";

const databaseThatPings = (ok: boolean) => ({ get: () => { throw new Error("not used"); }, ping: async () => ok, close: async () => {} });

describe("GET /health/ready", () => {
  let app: NestExpressApplication;

  afterEach(async () => {
    await app.close();
  });

  it("is ready when the database answers", async () => {
    app = await testApp([{ token: DATABASE, useValue: databaseThatPings(true) }]);
    const response = await request(app.getHttpServer()).get("/health/ready");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", checks: { config: "ok", database: "ok" } });
  });

  it("is degraded with 503 when the database is down", async () => {
    app = await testApp([{ token: DATABASE, useValue: databaseThatPings(false) }]);
    const response = await request(app.getHttpServer()).get("/health/ready");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "degraded", checks: { config: "ok", database: "down" } });
  });
});

describe("GET /", () => {
  let app: NestExpressApplication;

  afterEach(async () => {
    await app.close();
  });

  it("answers that the API is up and points to the health endpoints", async () => {
    app = await testApp([{ token: DATABASE, useValue: databaseThatPings(true) }]);
    const response = await request(app.getHttpServer()).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: "agri-agent API", status: "ok", health: "/health/ready" });
  });
});

