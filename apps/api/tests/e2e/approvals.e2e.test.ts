import type { NestExpressApplication } from "@nestjs/platform-express";
import { sql } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DATABASE } from "@/database";
import { PendingActionsService } from "@/modules/approvals/PendingActionsService";
import { cookieValue } from "@tests/support/oauth-stub";
import { testApp } from "@tests/support/create-test-app";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

const NOW = new Date();
const IN_AN_HOUR = new Date(NOW.getTime() + 60 * 60 * 1000);
const AN_HOUR_AGO = new Date(NOW.getTime() - 60 * 60 * 1000);
const SAVE_WHEAT = { name: "Wheat near Lyon", crop: "wheat", lat: 45.76, lon: 4.84, areaHa: "12.50" };

describe("approvals API", () => {
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
  const proposals = () => app.get(PendingActionsService);

  async function session(): Promise<{ cookie: string; userId: string }> {
    const first = await http().get("/session");
    return { cookie: cookieValue(first.headers["set-cookie"], "__Host-agri_session") ?? "", userId: first.body.userId };
  }

  async function countFields(): Promise<number> {
    const rows = (await test.db.execute(sql`select count(*)::int as count from fields`)) as unknown as { rows: Array<{ count: number }> };
    return rows.rows[0].count;
  }

  it("lists only the signed-in user's awaiting actions", async () => {
    const me = await session();
    const other = await session();
    const mine = await proposals().propose({ userId: me.userId, channel: "web", type: "field.save", payload: SAVE_WHEAT, expiresAt: IN_AN_HOUR, idempotencyKey: "mine" });
    await proposals().propose({ userId: other.userId, channel: "web", type: "field.save", payload: SAVE_WHEAT, expiresAt: IN_AN_HOUR, idempotencyKey: "theirs" });
    const response = await http().get("/approvals").set("Cookie", me.cookie);
    expect(response.status).toBe(200);
    expect(response.body.actions.map((action: { id: string }) => action.id)).toEqual([mine.id]);
  });

  it("confirm runs the field save and returns executed", async () => {
    const me = await session();
    const action = await proposals().propose({ userId: me.userId, channel: "web", type: "field.save", payload: SAVE_WHEAT, expiresAt: IN_AN_HOUR, idempotencyKey: "save-1" });
    const response = await http().post(`/approvals/${action.id}/confirm`).set("Cookie", me.cookie);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: action.id, status: "executed" });
    expect(await countFields()).toBe(1);
  });

  it("a second confirm is rejected with action_not_awaiting and does not save twice", async () => {
    const me = await session();
    const action = await proposals().propose({ userId: me.userId, channel: "web", type: "field.save", payload: SAVE_WHEAT, expiresAt: IN_AN_HOUR, idempotencyKey: "save-2" });
    await http().post(`/approvals/${action.id}/confirm`).set("Cookie", me.cookie);
    const again = await http().post(`/approvals/${action.id}/confirm`).set("Cookie", me.cookie);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("action_not_awaiting");
    expect(await countFields()).toBe(1);
  });

  it("confirming an expired action is rejected with action_expired and saves nothing", async () => {
    const me = await session();
    const action = await proposals().propose({ userId: me.userId, channel: "web", type: "field.save", payload: SAVE_WHEAT, expiresAt: AN_HOUR_AGO, idempotencyKey: "expired-1" });
    const response = await http().post(`/approvals/${action.id}/confirm`).set("Cookie", me.cookie);
    expect(response.status).toBe(410);
    expect(response.body.code).toBe("action_expired");
    expect(await countFields()).toBe(0);
  });

  it("another user's action is not found, and nothing is saved", async () => {
    const owner = await session();
    const intruder = await session();
    const action = await proposals().propose({ userId: owner.userId, channel: "web", type: "field.save", payload: SAVE_WHEAT, expiresAt: IN_AN_HOUR, idempotencyKey: "owned" });
    const response = await http().post(`/approvals/${action.id}/confirm`).set("Cookie", intruder.cookie);
    expect(response.status).toBe(404);
    expect(await countFields()).toBe(0);
  });

  it("reject changes nothing and marks the action rejected", async () => {
    const me = await session();
    const action = await proposals().propose({ userId: me.userId, channel: "web", type: "field.save", payload: SAVE_WHEAT, expiresAt: IN_AN_HOUR, idempotencyKey: "reject-1" });
    const response = await http().post(`/approvals/${action.id}/reject`).set("Cookie", me.cookie);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: action.id, status: "rejected" });
    expect(await countFields()).toBe(0);
  });

  it("a malformed action id is not found, not a server error", async () => {
    const me = await session();
    const response = await http().post("/approvals/not-a-uuid/confirm").set("Cookie", me.cookie);
    expect(response.status).toBe(404);
  });
});
