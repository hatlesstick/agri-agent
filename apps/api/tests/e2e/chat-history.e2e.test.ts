import type { NestExpressApplication } from "@nestjs/platform-express";
import { sql } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DATABASE } from "@/database";
import { cookieValue } from "@tests/support/oauth-stub";
import { testApp } from "@tests/support/create-test-app";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

const userMessage = (id: string, text: string) => ({ id, role: "user", parts: [{ type: "text", text }] });

describe("chat saved into a conversation", () => {
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

  async function savedMessages(conversationId: string): Promise<Array<{ role: string; text: string }>> {
    const rows = (await test.db.execute(
      sql`select role, parts from messages where conversation_id = ${conversationId} order by created_at`,
    )) as unknown as { rows: Array<{ role: string; parts: Array<{ type: string; text?: string }> }> };
    return rows.rows.map((row) => ({ role: row.role, text: row.parts.find((part) => part.type === "text")?.text ?? "" }));
  }

  it("saves the question and the reply, and titles the conversation from the question", async () => {
    const cookie = await signedIn();
    const created = await http().post("/conversations").set("Cookie", cookie);
    const reply = await http()
      .post("/chat")
      .set("Cookie", cookie)
      .send({ conversationId: created.body.id, messages: [userMessage("u1", "What causes spray drift?")] });
    expect(reply.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const messages = await savedMessages(created.body.id);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[0].text).toBe("What causes spray drift?");
    const listed = await http().get("/conversations").set("Cookie", cookie);
    expect(listed.body.conversations[0].title).toBe("What causes spray drift?");
  });

  it("refuses a conversation that belongs to another user and saves nothing", async () => {
    const alice = await signedIn();
    const created = await http().post("/conversations").set("Cookie", alice);
    const bob = await signedIn();
    const res = await http()
      .post("/chat")
      .set("Cookie", bob)
      .send({ conversationId: created.body.id, messages: [userMessage("u1", "What causes spray drift?")] });
    expect(res.status).toBe(404);
    expect(await savedMessages(created.body.id)).toEqual([]);
  });

  it("answers a chat without a conversation id exactly as before and saves nothing", async () => {
    const cookie = await signedIn();
    const res = await http().post("/chat").set("Cookie", cookie).send({ messages: [userMessage("u1", "What causes spray drift?")] });
    expect(res.status).toBe(200);
    const count = (await test.db.execute(sql`select count(*)::int as count from messages`)) as unknown as { rows: Array<{ count: number }> };
    expect(count.rows[0].count).toBe(0);
  });
});
