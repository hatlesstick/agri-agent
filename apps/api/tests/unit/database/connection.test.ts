import { describe, expect, it, vi } from "vitest";
import { LazyDatabase, type PoolLike } from "@/database";

function fakePool(): PoolLike & { end: ReturnType<typeof vi.fn>; query: ReturnType<typeof vi.fn> } {
  return { end: vi.fn(async () => {}), query: vi.fn(async () => ({ rows: [{ ok: 1 }] })) } as unknown as PoolLike & { end: ReturnType<typeof vi.fn>; query: ReturnType<typeof vi.fn> };
}

describe("LazyDatabase", () => {
  it("opens no pool until the database is used", async () => {
    const createPool = vi.fn(fakePool);
    const database = new LazyDatabase("postgres://agri@localhost/agri", createPool);
    expect(createPool).not.toHaveBeenCalled();
    await database.close();
    expect(createPool).not.toHaveBeenCalled();
  });

  it("creates exactly one pool and closes it", async () => {
    const pool = fakePool();
    const createPool = vi.fn(() => pool);
    const database = new LazyDatabase("postgres://agri@localhost/agri", createPool);
    database.get();
    database.get();
    expect(createPool).toHaveBeenCalledTimes(1);
    expect(createPool).toHaveBeenCalledWith("postgres://agri@localhost/agri");
    await database.close();
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it("reports whether the database answers", async () => {
    const healthy = new LazyDatabase("postgres://agri@localhost/agri", fakePool);
    expect(await healthy.ping()).toBe(true);
    const broken = fakePool();
    broken.query.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    expect(await new LazyDatabase("postgres://agri@localhost/agri", () => broken).ping()).toBe(false);
  });
});
