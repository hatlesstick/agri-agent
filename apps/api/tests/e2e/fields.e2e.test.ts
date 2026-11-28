import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DATABASE } from "@/database";
import { FIELDS_REPOSITORY } from "@/modules/fields";
import { cookieValue } from "@tests/support/oauth-stub";
import { testApp } from "@tests/support/create-test-app";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

const WHEAT = { name: "Wheat near Lyon", crop: "wheat", lat: 45.76, lon: 4.84, areaHa: "12.50", notes: null };

describe("GET /fields", () => {
  let test: TestDatabase;
  let app: NestExpressApplication;

  beforeEach(async () => {
    test = await testDatabase();
    await test.reset();
    app = await testApp([{ token: DATABASE, useValue: databaseHandle(test.db) }]);
  });

  afterEach(async () => {
    await app.close();
    await test.close();
  });

  const http = () => request(app.getHttpServer());

  async function signedIn(): Promise<{ cookie: string; userId: string }> {
    const first = await http().get("/session");
    return { cookie: cookieValue(first.headers["set-cookie"], "__Host-agri_session") ?? "", userId: first.body.userId };
  }

  it("returns an empty list for a new user", async () => {
    const { cookie } = await signedIn();
    const res = await http().get("/fields").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fields: [] });
  });

  it("returns the signed-in user's fields with numeric area and no other user's fields", async () => {
    const alice = await signedIn();
    const bob = await signedIn();
    await app.get(FIELDS_REPOSITORY).create(alice.userId, WHEAT);
    await app.get(FIELDS_REPOSITORY).create(bob.userId, { ...WHEAT, name: "Barley near Berlin" });
    const res = await http().get("/fields").set("Cookie", alice.cookie);
    expect(res.status).toBe(200);
    expect(res.body.fields.map((field: { name: string }) => field.name)).toEqual(["Wheat near Lyon"]);
    expect(res.body.fields[0].areaHa).toBe(12.5);
  });
});
