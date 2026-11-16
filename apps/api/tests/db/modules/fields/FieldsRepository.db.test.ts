import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FieldNameTakenError, FieldsRepository } from "@/modules/fields";
import { IdentitiesRepository } from "@/modules/identity";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

const WHEAT = { name: "Wheat near Lyon", crop: "wheat", lat: 45.76, lon: 4.84, areaHa: "12.50" };

describe("FieldsRepository", () => {
  let test: TestDatabase;
  let fields: FieldsRepository;
  let alice: string;
  let bob: string;

  beforeAll(async () => {
    test = await testDatabase();
    fields = new FieldsRepository(databaseHandle(test.db));
  });

  beforeEach(async () => {
    await test.reset();
    const identities = new IdentitiesRepository(databaseHandle(test.db));
    alice = (await identities.findOrCreateUser({ provider: "web", externalId: "alice" })).userId;
    bob = (await identities.findOrCreateUser({ provider: "web", externalId: "bob" })).userId;
  });

  afterAll(async () => {
    await test.close();
  });

  it("creates, lists, finds, updates and deletes the owner's fields", async () => {
    const field = await fields.create(alice, WHEAT);
    expect(field).toMatchObject({ ...WHEAT, userId: alice });
    expect((await fields.list(alice)).map((item) => item.id)).toEqual([field.id]);
    expect(await fields.getById(alice, field.id)).toMatchObject({ id: field.id });
    expect(await fields.findByName(alice, "WHEAT NEAR LYON")).toMatchObject({ id: field.id });
    const updated = await fields.update(alice, field.id, { crop: "barley", notes: "north slope" });
    expect(updated).toMatchObject({ crop: "barley", notes: "north slope" });
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(field.updatedAt.getTime());
    expect(await fields.delete(alice, field.id)).toBe(true);
    expect(await fields.list(alice)).toEqual([]);
  });

  it("never reads, changes or deletes another user's field", async () => {
    const field = await fields.create(alice, WHEAT);
    expect(await fields.list(bob)).toEqual([]);
    expect(await fields.getById(bob, field.id)).toBeNull();
    expect(await fields.findByName(bob, WHEAT.name)).toBeNull();
    expect(await fields.update(bob, field.id, { crop: "stolen" })).toBeNull();
    expect(await fields.delete(bob, field.id)).toBe(false);
    expect(await fields.getById(alice, field.id)).toMatchObject({ crop: "wheat" });
  });

  it("rejects a duplicate name for the same user, case-insensitively", async () => {
    await fields.create(alice, WHEAT);
    await expect(fields.create(alice, { ...WHEAT, name: "wheat NEAR lyon" })).rejects.toBeInstanceOf(FieldNameTakenError);
    await expect(fields.create(bob, WHEAT)).resolves.toMatchObject({ userId: bob });
  });
});
