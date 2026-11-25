import { describe, expect, it } from "vitest";
import { LangChainRagEngine } from "@/modules/rag/adapters/LangChainRagEngine";
import { MemoryDocChunkStore } from "@/modules/rag/adapters/MemoryDocChunkStore";
import { contentHash } from "@/modules/rag/domain/content-hash";
import type { StoredChunk } from "@/modules/rag/doc-chunk-store.types";

function stored(id: string, text: string, embedding: number[]): StoredChunk {
  return { id, source: "FAO 2001", title: "Spray drift", heading: id.split("#")[1], text, updatedAt: "2026-11-25", contentHash: contentHash(text), embedding };
}

const queryEmbeddings = { embedQuery: async () => [1, 0, 0] };

describe("LangChainRagEngine", () => {
  it("returns hits with the SearchHit fields, nearest first, with cosine scores", async () => {
    const store = new MemoryDocChunkStore();
    await store.upsertMany([
      stored("spray-drift.md#far", "Far text.", [0, 1, 0]),
      stored("spray-drift.md#near", "Near text.", [1, 0, 0]),
    ]);
    const engine = new LangChainRagEngine(store, queryEmbeddings);
    const hits = await engine.search("wind", { topK: 2 });
    expect(hits).toEqual([
      { id: "spray-drift.md#near", source: "FAO 2001", title: "Spray drift", heading: "near", text: "Near text.", score: expect.closeTo(1, 6) },
      { id: "spray-drift.md#far", source: "FAO 2001", title: "Spray drift", heading: "far", text: "Far text.", score: expect.closeTo(0, 6) },
    ]);
  });

  it("limits the result to topK", async () => {
    const store = new MemoryDocChunkStore();
    await store.upsertMany([stored("a.md#x", "A", [1, 0, 0]), stored("a.md#y", "B", [0.9, 0.1, 0]), stored("a.md#z", "C", [0, 1, 0])]);
    const hits = await new LangChainRagEngine(store, queryEmbeddings).search("q", { topK: 1 });
    expect(hits?.map((hit) => hit.id)).toEqual(["a.md#x"]);
  });

  it("returns null when nothing is stored, the same signal the JSON engine gives for a missing index", async () => {
    expect(await new LangChainRagEngine(new MemoryDocChunkStore(), queryEmbeddings).search("q", { topK: 3 })).toBeNull();
  });

  it("embeds the query through the given embeddings", async () => {
    const seen: string[] = [];
    const engine = new LangChainRagEngine(new MemoryDocChunkStore(), {
      embedQuery: async (text) => {
        seen.push(text);
        return [1, 0, 0];
      },
    });
    await engine.search("Can I spray in wind?", { topK: 3 });
    expect(seen).toEqual(["Can I spray in wind?"]);
  });
});
