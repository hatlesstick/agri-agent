import type { NestExpressApplication } from "@nestjs/platform-express";
import { sql } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DATABASE } from "@/database";
import { FIELDS_REPOSITORY, type FieldsRepository } from "@/modules/fields";
import { PendingActionsService } from "@/modules/approvals";
import { cookieValue } from "@tests/support/oauth-stub";
import { testApp } from "@tests/support/create-test-app";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

const IN_AN_HOUR = new Date(Date.now() + 60 * 60 * 1000);
const WHEAT = { name: "Wheat near Lyon", crop: "wheat", lat: 45.76, lon: 4.84 };

describe("POST /forget", () => {
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

  async function session(): Promise<{ cookie: string; userId: string }> {
    const first = await http().get("/session");
    return { cookie: cookieValue(first.headers["set-cookie"], "__Host-agri_session") ?? "", userId: first.body.userId };
  }

  async function count(table: "fields" | "pending_actions"): Promise<number> {
    const rows = (await test.db.execute(sql.raw(`select count(*)::int as count from ${table}`))) as unknown as { rows: Array<{ count: number }> };
    return rows.rows[0].count;
  }

  it("deletes only the caller's fields and actions, and blanks their audit payloads", async () => {
    const me = await session();
    const other = await session();
    const fields = app.get<FieldsRepository>(FIELDS_REPOSITORY);
    await fields.create(me.userId, WHEAT);
    await fields.create(other.userId, { ...WHEAT, name: "Other's wheat" });
    const actions = app.get(PendingActionsService);
    const mine = await actions.propose({ userId: me.userId, channel: "web", type: "field.save", payload: WHEAT, expiresAt: IN_AN_HOUR, idempotencyKey: "mine" });
    await actions.propose({ userId: other.userId, channel: "web", type: "field.save", payload: WHEAT, expiresAt: IN_AN_HOUR, idempotencyKey: "theirs" });
    await actions.decide({ userId: me.userId, actionId: mine.id, decision: "rejected", now: new Date(), executors: {} });

    const response = await http().post("/forget").set("Cookie", me.cookie);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deleted: { fields: 1, actions: 1, conversations: 0 } });
    expect(await count("fields")).toBe(1);
    expect(await count("pending_actions")).toBe(1);

    const audit = (await test.db.execute(sql`select payload from audit_log where user_id = ${me.userId}`)) as unknown as { rows: Array<{ payload: unknown }> };
    expect(audit.rows.length).toBeGreaterThan(0);
    expect(audit.rows.every((row) => JSON.stringify(row.payload) === "{}")).toBe(true);
  });

  it("works for a user with nothing to delete", async () => {
    const me = await session();
    const response = await http().post("/forget").set("Cookie", me.cookie);
    expect(response.body).toEqual({ deleted: { fields: 0, actions: 0, conversations: 0 } });
  });
});
