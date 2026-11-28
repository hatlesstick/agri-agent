import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingActionsRepository } from "@/modules/approvals/repositories/PendingActionsRepository";
import { PendingActionsService } from "@/modules/approvals/PendingActionsService";
import type { ActionExecutor } from "@/modules/approvals/approvals.types";
import { IdentitiesRepository } from "@/modules/identity";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

const NOW = new Date("2026-11-28T10:00:00Z");
const LATER = new Date("2026-11-28T10:30:00Z");
const EXPIRES = new Date("2026-11-28T10:15:00Z");

describe("PendingActionsService", () => {
  let test: TestDatabase;
  let service: PendingActionsService;
  let repository: PendingActionsRepository;
  let alice: string;
  let bob: string;
  let saved: ActionExecutor & { mock: { calls: unknown[][] } };
  const executors = (): Record<string, ActionExecutor> => ({ "field.save": saved });

  beforeAll(async () => {
    test = await testDatabase();
    repository = new PendingActionsRepository(databaseHandle(test.db));
    service = new PendingActionsService(repository);
  });

  beforeEach(async () => {
    await test.reset();
    saved = vi.fn<ActionExecutor>(async () => undefined);
    const identities = new IdentitiesRepository(databaseHandle(test.db));
    alice = (await identities.findOrCreateUser({ provider: "web", externalId: "alice" })).userId;
    bob = (await identities.findOrCreateUser({ provider: "web", externalId: "bob" })).userId;
  });

  afterAll(async () => {
    await test.close();
  });

  async function proposeSave(key = "k1") {
    return service.propose({ userId: alice, channel: "web", type: "field.save", payload: { name: "Wheat" }, expiresAt: EXPIRES, idempotencyKey: key });
  }

  it("proposes a pending action that does not run anything", async () => {
    const action = await proposeSave();
    expect(action.status).toBe("awaiting_confirmation");
    expect(saved).not.toHaveBeenCalled();
  });

  it("returns the same action for a repeated proposal with the same idempotency key", async () => {
    const first = await proposeSave("same");
    const second = await proposeSave("same");
    expect(second.id).toBe(first.id);
  });

  it("confirms once: the executor runs and the status becomes executed", async () => {
    const action = await proposeSave();
    const result = await service.decide({ userId: alice, actionId: action.id, decision: "confirmed", now: NOW, executors: executors() });
    expect(result).toMatchObject({ ok: true, action: { status: "executed" } });
    expect(saved).toHaveBeenCalledTimes(1);
  });

  it("a second confirm is a no-op and does not run the executor again", async () => {
    const action = await proposeSave();
    await service.decide({ userId: alice, actionId: action.id, decision: "confirmed", now: NOW, executors: executors() });
    const again = await service.decide({ userId: alice, actionId: action.id, decision: "confirmed", now: NOW, executors: executors() });
    expect(again).toEqual({ ok: false, reason: "not_awaiting" });
    expect(saved).toHaveBeenCalledTimes(1);
  });

  it("rejects a confirm after expires_at and never runs the executor", async () => {
    const action = await proposeSave();
    const result = await service.decide({ userId: alice, actionId: action.id, decision: "confirmed", now: LATER, executors: executors() });
    expect(result).toEqual({ ok: false, reason: "expired" });
    expect(saved).not.toHaveBeenCalled();
  });

  it("lets another user neither see nor confirm the action", async () => {
    const action = await proposeSave();
    const result = await service.decide({ userId: bob, actionId: action.id, decision: "confirmed", now: NOW, executors: executors() });
    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(saved).not.toHaveBeenCalled();
  });

  it("rejecting changes nothing in the data and never runs the executor", async () => {
    const action = await proposeSave();
    const result = await service.decide({ userId: alice, actionId: action.id, decision: "rejected", now: NOW, executors: executors() });
    expect(result).toMatchObject({ ok: true, action: { status: "rejected" } });
    expect(saved).not.toHaveBeenCalled();
  });

  it("marks the action failed when the executor throws, and reports it", async () => {
    const action = await proposeSave();
    const broken = { "field.save": vi.fn(async () => { throw new Error("db down"); }) };
    const result = await service.decide({ userId: alice, actionId: action.id, decision: "confirmed", now: NOW, executors: broken });
    expect(result).toEqual({ ok: false, reason: "execution_failed" });
    const row = await repository.find(alice, action.id);
    expect(row?.status).toBe("failed");
  });

  it("writes an audit row for every decision", async () => {
    const action = await proposeSave();
    await service.decide({ userId: alice, actionId: action.id, decision: "confirmed", now: NOW, executors: executors() });
    expect(await repository.auditCount(alice, action.id)).toBe(1);
  });
});
