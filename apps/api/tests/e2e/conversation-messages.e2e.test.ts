import type { NestExpressApplication } from "@nestjs/platform-express";
import { sql } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DATABASE } from "@/database";
import { cookieValue } from "@tests/support/oauth-stub";
import { testApp } from "@tests/support/create-test-app";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

describe("GET /conversations/:id/messages", () => {
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

  async function addMessage(conversationId: string, role: "user" | "assistant", text: string, at: string): Promise<void> {
    await test.db.execute(
      sql`insert into messages (conversation_id, role, parts, created_at) values (${conversationId}, ${role}, ${JSON.stringify([{ type: "text", text }])}::jsonb, ${at}::timestamptz)`,
    );
  }

  it("returns the messages of the user's conversation oldest first", async () => {
    const cookie = await signedIn();
    const created = await http().post("/conversations").set("Cookie", cookie);
    await addMessage(created.body.id, "user", "question", "2026-11-28T10:00:00Z");
    await addMessage(created.body.id, "assistant", "answer", "2026-11-28T10:00:05Z");
    const res = await http().get(`/conversations/${created.body.id}/messages`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant"]);
    expect(res.body.messages[1].parts[0].text).toBe("answer");
    expect(res.body.nextCursor).toBeNull();
  });

  it("does not show another user's messages", async () => {
    const alice = await signedIn();
    const created = await http().post("/conversations").set("Cookie", alice);
    await addMessage(created.body.id, "user", "private", "2026-11-28T10:00:00Z");
    const bob = await signedIn();
    expect((await http().get(`/conversations/${created.body.id}/messages`).set("Cookie", bob)).status).toBe(404);
  });

  it("rejects a malformed cursor", async () => {
    const cookie = await signedIn();
    const created = await http().post("/conversations").set("Cookie", cookie);
    const res = await http().get(`/conversations/${created.body.id}/messages?cursor=nope`).set("Cookie", cookie);
    expect(res.status).toBe(400);
  });
});
