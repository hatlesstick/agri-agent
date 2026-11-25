import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_MIN_SCORE, REAL_MIN_SCORE, searchDocs } from "@/modules/rag/domain/search";
import type { RagCandidate } from "@/modules/rag";
import { fakeRag } from "@tests/support/fake-ports";

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
