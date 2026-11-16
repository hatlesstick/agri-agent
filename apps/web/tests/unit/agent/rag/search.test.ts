import { afterEach, describe, expect, it, vi } from "vitest";
import { usableIndex } from "@/agent/rag/search";
import type { RagIndex } from "@/server/repositories/docs/docs.types";

const index = (model: string, dims: number): RagIndex => ({
  model,
  createdAt: "2026-11-11T00:00:00.000Z",
  chunks: [{ id: "a", source: "s", title: "t", heading: "h", text: "x", embedding: new Array(dims).fill(0.1) }],
});

describe("usableIndex", () => {
  afterEach(() => vi.restoreAllMocks());

  it("accepts an index built with the configured embedding model", () => {
    const built = index("google/gemini-embedding-001", 3);
    expect(usableIndex(built, "google/gemini-embedding-001")).toBe(built);
  });

  it("rejects and warns when the index was built with another model", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(usableIndex(index("openai/text-embedding-3-small", 3), "google/gemini-embedding-001")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("rejects a missing or empty index", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(usableIndex(null, "m")).toBeNull();
    expect(usableIndex({ ...index("m", 3), chunks: [] }, "m")).toBeNull();
  });
});
