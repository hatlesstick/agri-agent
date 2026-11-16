import { afterEach, describe, expect, it, vi } from "vitest";
import { createPgPool, LazyDatabase, PING_TIMEOUT_MS, type PoolLike } from "@/database";

type FakePool = PoolLike & { end: ReturnType<typeof vi.fn>; query: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };

function fakePool(): FakePool {
  return { end: vi.fn(async () => {}), query: vi.fn(async () => ({ rows: [{ ok: 1 }] })), on: vi.fn() } as unknown as FakePool;
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

  afterEach(() => vi.useRealTimers());

  it("reports a hanging database as down after the ping timeout", async () => {
    vi.useFakeTimers();
    const hanging = fakePool();
    hanging.query.mockReturnValueOnce(new Promise(() => {}));
    const result = new LazyDatabase("postgres://agri@localhost/agri", () => hanging).ping();
    await vi.advanceTimersByTimeAsync(PING_TIMEOUT_MS);
    expect(await result).toBe(false);
  });
});

describe("createPgPool", () => {
  it("sets connection and statement timeouts and handles idle client errors", () => {
    const pool = createPgPool("postgres://agri:secret@localhost/agri") as unknown as import("pg").Pool & { options: Record<string, unknown> };
    expect(pool.options).toMatchObject({ connectionTimeoutMillis: 3000, statement_timeout: 10_000 });
    expect(pool.listenerCount("error")).toBe(1);
    expect(() => pool.emit("error", new Error("terminating connection"))).not.toThrow();
    void pool.end();
  });
});
