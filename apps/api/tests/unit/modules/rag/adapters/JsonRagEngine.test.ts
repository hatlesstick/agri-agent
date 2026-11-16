import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocsRepository } from "@/modules/rag/adapters/DocsRepository";
import { JsonRagEngine } from "@/modules/rag/adapters/JsonRagEngine";

describe("JsonRagEngine (mock embeddings)", () => {
  beforeEach(() => vi.stubEnv("AI_MOCK", "1"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns at most topK candidates sorted by score with their source", async () => {
    const candidates = await new JsonRagEngine().search("spray drift wind droplets", { topK: 3 });
    expect(candidates).toHaveLength(3);
    const scores = candidates?.map((candidate) => candidate.score) ?? [];
    expect(scores).toEqual([...scores].sort((left, right) => right - left));
    expect(candidates?.every((candidate) => candidate.source.length > 0 && !("embedding" in candidate))).toBe(true);
  });

  it("builds the index once and again after reset", async () => {
    const docs = new DocsRepository();
    const read = vi.spyOn(docs, "readCorpusChunks");
    const engine = new JsonRagEngine(docs);
    await engine.search("drift", { topK: 3 });
    await engine.search("inversion", { topK: 3 });
    expect(read).toHaveBeenCalledTimes(1);
    engine.reset();
    await engine.search("drift", { topK: 3 });
    expect(read).toHaveBeenCalledTimes(2);
  });
});
