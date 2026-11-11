import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "@/domain/rag/chunk";
import { cosineSimilarity, rankChunks } from "@/domain/rag/search";
import type { RagIndex } from "@/domain/rag/types";

const DOC = "# Spray drift\n\nSource: FAO 2001\n\nIntro text that is ignored.\n\n## Main factors\n\nWind and droplet size.\n\n## Empty\n\n## Practical measures\n\nUse low-drift nozzles.\n";

describe("chunkMarkdown", () => {
  it("creates one chunk per non-empty section with title and source", () => {
    expect(chunkMarkdown("spray-drift.md", DOC)).toEqual([
      { id: "spray-drift.md#main-factors", source: "FAO 2001", title: "Spray drift", heading: "Main factors", text: "Spray drift — Main factors\n\nWind and droplet size." },
      { id: "spray-drift.md#practical-measures", source: "FAO 2001", title: "Spray drift", heading: "Practical measures", text: "Spray drift — Practical measures\n\nUse low-drift nozzles." },
    ]);
  });

  it("requires a title and a source line", () => {
    expect(() => chunkMarkdown("a.md", "Source: x\n\n## S\n\ntext")).toThrow(/Title/);
    expect(() => chunkMarkdown("b.md", "# T\n\n## S\n\ntext")).toThrow(/Source/);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for the same direction, 0 for orthogonal and -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("returns 0 for empty, zero or mismatched vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe("rankChunks", () => {
  const chunk = (id: string, embedding: number[]) => ({ id, source: "s", title: "t", heading: id, text: id, embedding });
  const index: RagIndex = {
    model: "test",
    createdAt: "2026-11-11T00:00:00.000Z",
    chunks: [chunk("a", [1, 0, 0]), chunk("b", [0.9, 0.1, 0]), chunk("c", [0, 1, 0]), chunk("d", [0.7, 0.7, 0])],
  };

  it("orders by score, applies the threshold and top-k, and drops embeddings", () => {
    const hits = rankChunks([1, 0, 0], index, { topK: 2, minScore: 0.5 });
    expect(hits.map((hit) => hit.id)).toEqual(["a", "b"]);
    expect(hits[0]).not.toHaveProperty("embedding");
  });

  it("returns nothing when no chunk passes the threshold", () => {
    expect(rankChunks([0, 0, 1], index, { minScore: 0.5 })).toEqual([]);
  });

  it("returns nothing for an empty index", () => {
    expect(rankChunks([1, 0, 0], { ...index, chunks: [] }, { minScore: 0 })).toEqual([]);
  });
});
