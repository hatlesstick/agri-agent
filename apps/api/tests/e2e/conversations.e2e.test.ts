import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DATABASE } from "@/database";
import { cookieValue } from "@tests/support/oauth-stub";
import { testApp } from "@tests/support/create-test-app";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

describe("conversations API", () => {
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

  async function signedIn(): Promise<string> {
    const first = await http().get("/session");
    return cookieValue(first.headers["set-cookie"], "__Host-agri_session") ?? "";
  }

  it("lists an empty history for a new user", async () => {
    const cookie = await signedIn();
    const res = await http().get("/conversations").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ conversations: [], nextCursor: null });
  });

  it("creates a conversation with no title and returns it", async () => {
    const cookie = await signedIn();
    const created = await http().post("/conversations").set("Cookie", cookie);
    expect(created.status).toBe(201);
    expect(created.body.title).toBeNull();
    const listed = await http().get("/conversations").set("Cookie", cookie);
    expect(listed.body.conversations.map((c: { id: string }) => c.id)).toEqual([created.body.id]);
  });

  it("renames a conversation and rejects an empty title", async () => {
    const cookie = await signedIn();
    const created = await http().post("/conversations").set("Cookie", cookie);
    const renamed = await http().patch(`/conversations/${created.body.id}`).set("Cookie", cookie).send({ title: "Пшениця біля Ліона" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.title).toBe("Пшениця біля Ліона");
    const empty = await http().patch(`/conversations/${created.body.id}`).set("Cookie", cookie).send({ title: "   " });
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe("invalid_request");
  });

  it("deletes a conversation, then it is not found", async () => {
    const cookie = await signedIn();
    const created = await http().post("/conversations").set("Cookie", cookie);
    expect((await http().delete(`/conversations/${created.body.id}`).set("Cookie", cookie)).status).toBe(204);
    expect((await http().get(`/conversations/${created.body.id}`).set("Cookie", cookie)).status).toBe(404);
  });

  it("does not show, rename or delete another user's conversation", async () => {
    const alice = await signedIn();
    const created = await http().post("/conversations").set("Cookie", alice);
    const bob = await signedIn();
    expect((await http().get(`/conversations/${created.body.id}`).set("Cookie", bob)).status).toBe(404);
    expect((await http().patch(`/conversations/${created.body.id}`).set("Cookie", bob).send({ title: "x" })).status).toBe(404);
    expect((await http().delete(`/conversations/${created.body.id}`).set("Cookie", bob)).status).toBe(404);
    expect((await http().get("/conversations").set("Cookie", bob)).body.conversations).toEqual([]);
  });

  it("answers 404 for a malformed id, not a server error", async () => {
    const cookie = await signedIn();
    const res = await http().get("/conversations/not-a-uuid").set("Cookie", cookie);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("not_found");
  });

  it("gives a visitor without a cookie an anonymous session with an empty history", async () => {
    const res = await http().get("/conversations");
    expect(res.status).toBe(200);
    expect(res.body.conversations).toEqual([]);
    expect(res.headers["set-cookie"]).toBeDefined();
  });
});
