import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryCacheStore } from "@/common/cache";

describe("InMemoryCacheStore", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-16T10:00:00Z") }));
  afterEach(() => vi.useRealTimers());

  it("returns a value until its TTL passes, then forgets it", async () => {
    const store = new InMemoryCacheStore({ maxEntries: 10 });
    await store.set("a", { value: 1 }, 1000);
    expect(await store.get("a")).toEqual({ value: 1 });
    vi.setSystemTime(new Date("2026-11-16T10:00:01Z"));
    expect(await store.get("a")).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it("evicts the least recently read key when full", async () => {
    const store = new InMemoryCacheStore({ maxEntries: 2 });
    await store.set("a", 1, 60_000);
    await store.set("b", 2, 60_000);
    await store.get("a");
    await store.set("c", 3, 60_000);
    expect(await store.get("a")).toBe(1);
    expect(await store.get("b")).toBeUndefined();
    expect(await store.get("c")).toBe(3);
  });

  it("deletes and clears", async () => {
    const store = new InMemoryCacheStore({ maxEntries: 10 });
    await store.set("a", 1, 60_000);
    await store.set("b", 2, 60_000);
    await store.delete("a");
    expect(await store.get("a")).toBeUndefined();
    await store.clear();
    expect(store.size).toBe(0);
  });
});
