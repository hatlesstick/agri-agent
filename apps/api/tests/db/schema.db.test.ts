import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { auditLog, conversations, fields, identities, messages, pendingActions, usageDaily, users } from "@/database/schema";
import { testDatabase, type TestDatabase } from "@tests/support/test-database";

const TABLES = ["audit_log", "conversations", "fields", "identities", "messages", "pending_actions", "sessions", "usage_daily", "users"];

describe("database schema", () => {
  let test: TestDatabase;

  beforeAll(async () => {
    test = await testDatabase();
  });

  beforeEach(async () => {
    await test.reset();
  });

  afterAll(async () => {
    await test.close();
  });

  async function newUser(): Promise<string> {
    const [user] = await test.db.insert(users).values({}).returning({ id: users.id });
    return user.id;
  }

  it("creates every Step 2 table, plus doc_chunks where pgvector is available", async () => {
    const extension = (await test.db.execute(sql`select 1 from pg_available_extensions where name = 'vector'`)) as unknown as { rows: unknown[] };
    const expected = extension.rows.length > 0 ? [...TABLES, "doc_chunks"].sort() : TABLES;
    const result = (await test.db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`)) as unknown as { rows: Array<{ table_name: string }> };
    expect(result.rows.map((row) => row.table_name).sort()).toEqual(expected);
  });

  it("allows one identity per provider and external id", async () => {
    const first = await newUser();
    const second = await newUser();
    await test.db.insert(identities).values({ userId: first, provider: "telegram", externalId: "42" });
    await expect(test.db.insert(identities).values({ userId: second, provider: "telegram", externalId: "42" })).rejects.toThrow();
  });

  it("keeps field names unique per user regardless of case", async () => {
    const first = await newUser();
    const second = await newUser();
    const field = { name: "Wheat", lat: 45.76, lon: 4.84 };
    await test.db.insert(fields).values({ ...field, userId: first });
    await expect(test.db.insert(fields).values({ ...field, name: "wheat", userId: first })).rejects.toThrow();
    await test.db.insert(fields).values({ ...field, userId: second });
  });

  it("removes a deleted user's data but keeps anonymised audit rows", async () => {
    const userId = await newUser();
    await test.db.insert(identities).values({ userId, provider: "web", externalId: "w1" });
    const [field] = await test.db.insert(fields).values({ userId, name: "Wheat", lat: 45.76, lon: 4.84 }).returning({ id: fields.id });
    const [conversation] = await test.db.insert(conversations).values({ userId, channel: "web" }).returning({ id: conversations.id });
    await test.db.insert(messages).values({ conversationId: conversation.id, role: "user", parts: [{ type: "text", text: "hi" }] });
    const [action] = await test.db
      .insert(pendingActions)
      .values({ userId, fieldId: field.id, type: "save_field", payload: {}, channel: "web", expiresAt: new Date(Date.now() + 60_000), idempotencyKey: "k1" })
      .returning({ id: pendingActions.id });
    await test.db.insert(auditLog).values({ userId, actor: "user", action: "field.created", payload: { name: "Wheat" }, pendingActionId: action.id });
    await test.db.insert(usageDaily).values({ userId, date: "2026-11-16", inputTokens: 10, outputTokens: 5, costUsd: "0.000100" });

    await test.db.delete(users).where(sql`${users.id} = ${userId}`);

    for (const table of [identities, fields, conversations, messages, pendingActions, usageDaily]) {
      expect(await test.db.$count(table)).toBe(0);
    }
    const audit = await test.db.select().from(auditLog);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ userId: null, pendingActionId: null, action: "field.created" });
  });

  it("rejects impossible coordinates and negative areas", async () => {
    const userId = await newUser();
    await expect(test.db.insert(fields).values({ userId, name: "North", lat: 91, lon: 0 })).rejects.toThrow();
    await expect(test.db.insert(fields).values({ userId, name: "East", lat: 0, lon: 181 })).rejects.toThrow();
    await expect(test.db.insert(fields).values({ userId, name: "Negative", lat: 0, lon: 0, areaHa: "-1" })).rejects.toThrow();
  });

  it("indexes the foreign keys that cascades and /forget walk", async () => {
    const result = (await test.db.execute(sql`select indexname from pg_indexes where schemaname = 'public'`)) as unknown as { rows: Array<{ indexname: string }> };
    expect(result.rows.map((row) => row.indexname)).toEqual(expect.arrayContaining(["audit_log_pending_action_id_idx", "pending_actions_field_id_idx", "messages_conversation_created_idx", "fields_user_id_name_unique"]));
  });
});
