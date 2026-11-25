import { describe, expect, it, vi, beforeEach } from "vitest";

const embedMock = vi.fn();
const embedManyMock = vi.fn();

vi.mock("ai", () => ({
  embed: (...args: unknown[]) => embedMock(...args),
  embedMany: (...args: unknown[]) => embedManyMock(...args),
}));

import { AiSdkEmbeddings } from "@/modules/rag/embeddings/ai-sdk-embeddings";
import type { EmbeddingBackend } from "@/modules/rag/embeddings/ai-sdk-embeddings.types";
import { EMBEDDING_MODEL } from "@/modules/rag/embeddings/embedding-model";
import { mockEmbedding } from "@/modules/rag/embeddings/mock-embedding";

function length(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

describe("AiSdkEmbeddings", () => {
  beforeEach(() => {
    embedMock.mockReset();
    embedManyMock.mockReset();
  });

  it("returns normalized vectors for documents and for the query", async () => {
    const backend: EmbeddingBackend = {
      embedMany: async (values) => values.map(() => [3, 4]),
      embed: async () => [0, 5],
    };
    const embeddings = new AiSdkEmbeddings(backend);
    const documents = await embeddings.embedDocuments(["a", "b"]);
    const query = await embeddings.embedQuery("q");
    expect(documents).toHaveLength(2);
    for (const vector of [...documents, query]) expect(length(vector)).toBeCloseTo(1);
    expect(query).toEqual([0, 1]);
  });

  it("gives identical texts identical vectors, so cosine similarity of a text with itself is 1", async () => {
    const embeddings = new AiSdkEmbeddings({
      embedMany: async (values) => values.map((value) => mockEmbedding(value, 1536)),
      embed: async (value) => mockEmbedding(value, 1536),
    });
    const [vector] = await embeddings.embedDocuments(["Wind speed and droplet size"]);
    const query = await embeddings.embedQuery("Wind speed and droplet size");
    const dot = vector.reduce((sum, value, index) => sum + value * query[index], 0);
    expect(dot).toBeCloseTo(1);
  });

  it("the real backend asks Gemini for 1536 dimensions through providerOptions", async () => {
    const { createEmbeddingBackend } = await import("@/modules/rag/embeddings/ai-sdk-embeddings");
    embedManyMock.mockResolvedValue({ embeddings: [[1, 0]] });
    embedMock.mockResolvedValue({ embedding: [0, 1] });
    const backend = createEmbeddingBackend(false);
    await backend.embedMany(["doc"]);
    await backend.embed("query");
    expect(embedManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: EMBEDDING_MODEL,
        values: ["doc"],
        providerOptions: { google: { outputDimensionality: 1536 } },
      }),
    );
    expect(embedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: EMBEDDING_MODEL,
        value: "query",
        providerOptions: { google: { outputDimensionality: 1536 } },
      }),
    );
  });

  it("the mock backend produces 1536-dimension vectors and never calls the provider", async () => {
    const { createEmbeddingBackend } = await import("@/modules/rag/embeddings/ai-sdk-embeddings");
    const backend = createEmbeddingBackend(true);
    const [vector] = await backend.embedMany(["Spray drift in wind"]);
    expect(vector).toHaveLength(1536);
    expect(await backend.embed("Spray drift in wind")).toEqual(vector);
    expect(embedMock).not.toHaveBeenCalled();
    expect(embedManyMock).not.toHaveBeenCalled();
  });
});
