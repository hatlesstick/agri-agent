import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { problemDetailsSchema } from "@agri/shared/contracts";
import { testApp } from "@tests/support/create-test-app";

describe("API skeleton", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await testApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers unknown routes with a not_found problem carrying the request id", async () => {
    const response = await request(app.getHttpServer()).get("/nope").set("x-request-id", "req-42");
    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/^application\/problem\+json/);
    expect(response.headers["x-request-id"]).toBe("req-42");
    expect(problemDetailsSchema.parse(response.body)).toMatchObject({ status: 404, code: "not_found", instance: "req-42" });
  });

  it("rejects oversized and malformed JSON bodies with problems", async () => {
    const big = await request(app.getHttpServer()).post("/nope").set("content-type", "application/json").send(JSON.stringify({ text: "x".repeat(300 * 1024) }));
    expect(big.status).toBe(413);
    expect(big.body).toMatchObject({ code: "payload_too_large" });
    const broken = await request(app.getHttpServer()).post("/nope").set("content-type", "application/json").send("{");
    expect(broken.status).toBe(400);
    expect(broken.body).toMatchObject({ code: "invalid_request" });
  });

  it("gives body-parser errors a request id and a client error code", async () => {
    const broken = await request(app.getHttpServer()).post("/nope").set("content-type", "application/json").set("x-request-id", "req-parse").send("{");
    expect(broken.headers["x-request-id"]).toBe("req-parse");
    expect(broken.body).toMatchObject({ code: "invalid_request", instance: "req-parse" });
    const anonymous = await request(app.getHttpServer()).post("/nope").set("content-type", "application/json").send("{");
    expect(anonymous.body.instance).toMatch(/^[0-9a-f-]{36}$/);
    expect(anonymous.headers["x-request-id"]).toBe(anonymous.body.instance);
    const charset = await request(app.getHttpServer()).post("/nope").set("content-type", "application/json; charset=latin9").send("{}");
    expect(charset.status).toBe(415);
    expect(charset.body).toMatchObject({ code: "invalid_request" });
  });

  it("reports liveness and readiness", async () => {
    expect((await request(app.getHttpServer()).get("/health/live")).body).toEqual({ status: "ok" });
    expect((await request(app.getHttpServer()).get("/health/ready")).body).toEqual({ status: "ok", checks: { config: "ok", database: "ok" } });
  });

  it("sends baseline security headers", async () => {
    const response = await request(app.getHttpServer()).get("/health/live");
    expect(response.headers).toMatchObject({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "cross-origin-resource-policy": "same-site",
    });
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("documents the chat stream and its server error in OpenAPI", async () => {
    const chat = (await request(app.getHttpServer()).get("/openapi.json")).body.paths["/chat"].post.responses;
    expect(chat["200"].content["text/event-stream"]).toBeDefined();
    expect(chat["500"]).toBeDefined();
  });

  it("serves the OpenAPI document with the problem details schema", async () => {
    const response = await request(app.getHttpServer()).get("/openapi.json");
    expect(response.status).toBe(200);
    expect(response.body.components.schemas.ProblemDetails).toBeDefined();
  });
});
