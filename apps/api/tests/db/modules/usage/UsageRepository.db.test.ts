import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UsageRepository } from "@/modules/usage/repositories/UsageRepository";
import { IdentitiesRepository } from "@/modules/identity";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

describe("UsageRepository", () => {
  let test: TestDatabase;
  let usage: UsageRepository;
  let alice: string;

  beforeAll(async () => {
    test = await testDatabase();
    usage = new UsageRepository(databaseHandle(test.db));
  });

  beforeEach(async () => {
    await test.reset();
    alice = (await new IdentitiesRepository(databaseHandle(test.db)).findOrCreateUser({ provider: "web", externalId: "alice-usage" })).userId;
  });

  afterAll(async () => {
    await test.close();
  });

  it("adds tokens for the same day and reports the total", async () => {
    await usage.add(alice, "2026-11-28", { inputTokens: 100, outputTokens: 20 });
    await usage.add(alice, "2026-11-28", { inputTokens: 50, outputTokens: 5 });
    expect(await usage.totalTokens(alice, "2026-11-28")).toBe(175);
  });

  it("keeps each day separate", async () => {
    await usage.add(alice, "2026-11-27", { inputTokens: 900, outputTokens: 0 });
    expect(await usage.totalTokens(alice, "2026-11-28")).toBe(0);
  });
});
