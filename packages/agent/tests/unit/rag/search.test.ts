import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usableIndex } from "@/rag/JsonRagEngine";
import { MOCK_MIN_SCORE, REAL_MIN_SCORE, searchDocs } from "@/rag/search";
import type { RagCandidate } from "@/ports";
import { fakeRag } from "@tests/support/fake-ports";
import type { RagIndex } from "@/docs/docs.types";

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

const hit = (id: string, score: number): RagCandidate => ({ id, source: "s", title: "t", heading: id, text: id, score });

describe("searchDocs", () => {
  beforeEach(() => vi.stubEnv("AI_MOCK", "0"));
  afterEach(() => vi.unstubAllEnvs());

  it("passes topK to the engine and cuts an over-long answer", async () => {
    const rag = fakeRag([hit("a", 0.9), hit("c", 0.8), hit("d", 0.7), hit("e", 0.66)]);
    expect((await searchDocs(rag, "drift", { topK: 3 }))?.map((candidate) => candidate.id)).toEqual(["a", "c", "d"]);
    expect(rag.calls).toEqual([{ query: "drift", topK: 3 }]);
  });

  it("orders candidates by score even when the engine does not", async () => {
    const rag = fakeRag([hit("low", 0.7), hit("high", 0.95), hit("mid", 0.8), hit("top", 0.99)]);
    expect((await searchDocs(rag, "drift", { topK: 3 }))?.map((candidate) => candidate.id)).toEqual(["top", "high", "mid"]);
  });

  it("drops candidates below the threshold", async () => {
    const rag = fakeRag([hit("a", 0.9), hit("b", REAL_MIN_SCORE - 0.01)]);
    expect((await searchDocs(rag, "drift", { topK: 2 }))?.map((candidate) => candidate.id)).toEqual(["a"]);
  });

  it("returns null when the engine has no usable index", async () => {
    expect(await searchDocs(fakeRag(null), "drift")).toBeNull();
  });

  it("uses the mock threshold in mock mode", async () => {
    vi.stubEnv("AI_MOCK", "1");
    const rag = fakeRag([hit("a", REAL_MIN_SCORE - 0.01), hit("b", MOCK_MIN_SCORE - 0.01)]);
    expect((await searchDocs(rag, "drift"))?.map((candidate) => candidate.id)).toEqual(["a"]);
  });
});
