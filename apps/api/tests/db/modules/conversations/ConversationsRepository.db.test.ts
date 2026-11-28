import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ConversationsRepository } from "@/modules/conversations/repositories/ConversationsRepository";
import { IdentitiesRepository } from "@/modules/identity";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

describe("ConversationsRepository", () => {
  let test: TestDatabase;
  let conversations: ConversationsRepository;
  let alice: string;
  let bob: string;

  beforeAll(async () => {
    test = await testDatabase();
    conversations = new ConversationsRepository(databaseHandle(test.db));
  });

  beforeEach(async () => {
    await test.reset();
    const identities = new IdentitiesRepository(databaseHandle(test.db));
    alice = (await identities.findOrCreateUser({ provider: "web", externalId: "alice-conv" })).userId;
    bob = (await identities.findOrCreateUser({ provider: "web", externalId: "bob-conv" })).userId;
  });

  afterAll(async () => {
    await test.close();
  });

  it("lists only the user's conversations, newest first, and respects the cursor", async () => {
    const older = await conversations.create(alice, null, new Date("2026-11-27T10:00:00Z"));
    const newer = await conversations.create(alice, null, new Date("2026-11-28T10:00:00Z"));
    await conversations.create(bob, null, new Date("2026-11-28T11:00:00Z"));
    expect((await conversations.list(alice, null, 10)).map((c) => c.id)).toEqual([newer.id, older.id]);
    expect((await conversations.list(alice, new Date("2026-11-28T00:00:00Z"), 10)).map((c) => c.id)).toEqual([older.id]);
  });

  it("renames and bumps updatedAt only for the owner", async () => {
    const created = await conversations.create(alice, null, new Date("2026-11-27T10:00:00Z"));
    const renamed = await conversations.rename(alice, created.id, "Пшениця", new Date("2026-11-28T10:00:00Z"));
    expect(renamed?.title).toBe("Пшениця");
    expect(renamed?.updatedAt.toISOString()).toBe("2026-11-28T10:00:00.000Z");
    expect(await conversations.rename(bob, created.id, "hijack", new Date())).toBeNull();
  });

  it("removes only the owner's conversation", async () => {
    const created = await conversations.create(alice, null, new Date());
    expect(await conversations.remove(bob, created.id)).toBe(false);
    expect(await conversations.remove(alice, created.id)).toBe(true);
    expect(await conversations.find(alice, created.id)).toBeNull();
  });
});
