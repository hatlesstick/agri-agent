import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sessions, users } from "@/database/schema";
import { SessionsRepository } from "@/modules/identity/repositories/SessionsRepository";
import { UsersRepository } from "@/modules/identity/repositories/UsersRepository";
import { SESSION_TTL_MS } from "@/modules/identity/session/session.constants";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

const NOW = new Date("2026-11-24T12:00:00.000Z");
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

describe("SessionsRepository", () => {
  let test: TestDatabase;
  let repository: SessionsRepository;
  let usersRepository: UsersRepository;
  let userId: string;

  beforeAll(async () => {
    test = await testDatabase();
    repository = new SessionsRepository(databaseHandle(test.db));
    usersRepository = new UsersRepository(databaseHandle(test.db));
  });

  beforeEach(async () => {
    await test.reset();
    const [user] = await test.db.insert(users).values({}).returning({ id: users.id });
    userId = user.id;
  });

  afterAll(async () => {
    await test.close();
  });

  it("creates a session that expires after the session TTL and is found while active", async () => {
    const session = await repository.create(userId, HASH_A, NOW);
    expect(session).toMatchObject({ userId, tokenHash: HASH_A });
    expect(session.expiresAt.getTime()).toBe(NOW.getTime() + SESSION_TTL_MS);
    expect(await repository.findActive(HASH_A, NOW)).toMatchObject({ id: session.id, userId });
  });

  it("does not find an expired session", async () => {
    await repository.create(userId, HASH_A, NOW);
    const afterExpiry = new Date(NOW.getTime() + SESSION_TTL_MS + 1);
    expect(await repository.findActive(HASH_A, afterExpiry)).toBeNull();
  });

  it("does not find an unknown token hash", async () => {
    await repository.create(userId, HASH_A, NOW);
    expect(await repository.findActive(HASH_B, NOW)).toBeNull();
  });

  it("moves last_seen_at and expires_at forward on touch", async () => {
    const session = await repository.create(userId, HASH_A, NOW);
    const later = new Date(NOW.getTime() + 25 * 60 * 60 * 1000);
    await repository.touch(session.id, later);
    const [row] = await test.db.select().from(sessions);
    expect(row.lastSeenAt.getTime()).toBe(later.getTime());
    expect(row.expiresAt.getTime()).toBe(later.getTime() + SESSION_TTL_MS);
  });

  it("deletes a session by token hash and reports whether it existed", async () => {
    await repository.create(userId, HASH_A, NOW);
    expect(await repository.delete(HASH_A)).toBe(true);
    expect(await repository.findActive(HASH_A, NOW)).toBeNull();
    expect(await repository.delete(HASH_A)).toBe(false);
  });

  it("removes the sessions of a deleted user by cascade", async () => {
    await repository.create(userId, HASH_A, NOW);
    expect(await usersRepository.delete(userId)).toBe(true);
    expect(await test.db.$count(sessions)).toBe(0);
  });

  it("rejects a second session with the same token hash", async () => {
    await repository.create(userId, HASH_A, NOW);
    await expect(repository.create(userId, HASH_A, NOW)).rejects.toThrow();
  });
});
