import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { testApp } from "@tests/support/create-test-app";

describe("GET /auth/providers", () => {
  let app: NestExpressApplication;

  afterEach(async () => {
    await app.close();
  });

  it("lists no providers when none are configured", async () => {
    app = await testApp();
    const response = await request(app.getHttpServer()).get("/auth/providers");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ providers: [] });
  });

  it("lists GitHub when its keys are configured", async () => {
    app = await testApp([], { GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret", PUBLIC_APP_ORIGIN: "https://agri-agent-m.vercel.app" });
    const response = await request(app.getHttpServer()).get("/auth/providers");
    expect(response.body).toEqual({ providers: ["github"] });
  });

  it("answers 404 for a provider whose keys are missing", async () => {
    app = await testApp();
    const response = await request(app.getHttpServer()).get("/auth/google/start");
    expect(response.status).toBe(404);
  });
});
