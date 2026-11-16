import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { identities, users } from "@/database/schema";
import { IdentitiesRepository, UsersRepository } from "@/modules/identity";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

describe("IdentitiesRepository.findOrCreateUser", () => {
  let test: TestDatabase;
  let repository: IdentitiesRepository;
  let usersRepository: UsersRepository;

  beforeAll(async () => {
    test = await testDatabase();
    repository = new IdentitiesRepository(databaseHandle(test.db));
    usersRepository = new UsersRepository(databaseHandle(test.db));
  });

  beforeEach(async () => {
    await test.reset();
  });

  afterAll(async () => {
    await test.close();
  });

  it("creates a user on the first visit and returns the same user afterwards", async () => {
    const first = await repository.findOrCreateUser({ provider: "web", externalId: "browser-1", locale: "uk" });
    const second = await repository.findOrCreateUser({ provider: "web", externalId: "browser-1" });
    expect(first.created).toBe(true);
    expect(second).toEqual({ userId: first.userId, created: false });
    expect(await usersRepository.getById(first.userId)).toMatchObject({ id: first.userId, locale: "uk" });
  });

  it("keeps different providers apart", async () => {
    const web = await repository.findOrCreateUser({ provider: "web", externalId: "42" });
    const telegram = await repository.findOrCreateUser({ provider: "telegram", externalId: "42" });
    expect(web.userId).not.toBe(telegram.userId);
  });

  it("creates exactly one user under concurrent first visits", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => repository.findOrCreateUser({ provider: "telegram", externalId: "777" })));
    expect(new Set(results.map((result) => result.userId)).size).toBe(1);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(await test.db.$count(users)).toBe(1);
    expect(await test.db.$count(identities)).toBe(1);
  });

  it("deletes a user", async () => {
    const { userId } = await repository.findOrCreateUser({ provider: "web", externalId: "gone" });
    expect(await usersRepository.delete(userId)).toBe(true);
    expect(await usersRepository.getById(userId)).toBeNull();
    expect(await usersRepository.delete(userId)).toBe(false);
  });
});
