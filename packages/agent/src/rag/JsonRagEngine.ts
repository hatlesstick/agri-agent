import { embed } from "ai";
import { DocsRepository, docsRepository } from "@/docs/DocsRepository";
import type { RagIndex } from "@/docs/docs.types";
import { mockEmbedding } from "@/mock/embedding";
import { EMBEDDING_MODEL, isMockMode } from "@/model";
import type { RagCandidate, RagEngine } from "@/ports";
import { rankChunks } from "@/rag/rank";

export function usableIndex(index: RagIndex | null, embeddingModel: string): RagIndex | null {
  if (!index || index.chunks.length === 0) {
    console.warn("rag: index is missing or empty; run pnpm index");
    return null;
  }
  if (index.model !== embeddingModel) {
    console.warn(`rag: index was built with ${index.model} but queries use ${embeddingModel}; run pnpm index`);
    return null;
  }
  return index;
}

async function embedQuery(query: string): Promise<number[]> {
  if (isMockMode()) return mockEmbedding(query);
  const { embedding } = await embed({ model: EMBEDDING_MODEL, value: query, maxRetries: 2 });
  return embedding;
}

export class JsonRagEngine implements RagEngine {
  private cachedIndex: RagIndex | null = null;

  constructor(private readonly docs: DocsRepository = docsRepository) {}

  async search(query: string, { topK }: { topK: number }): Promise<RagCandidate[] | null> {
    const index = this.loadIndex();
    if (!index) return null;
    return rankChunks(await embedQuery(query), index, { topK, minScore: Number.NEGATIVE_INFINITY });
  }

  reset(): void {
    this.cachedIndex = null;
  }

  private loadIndex(): RagIndex | null {
    if (this.cachedIndex) return this.cachedIndex;
    if (isMockMode()) return (this.cachedIndex = this.buildMockIndex());
    this.cachedIndex = usableIndex(this.docs.readIndex(), EMBEDDING_MODEL);
    return this.cachedIndex;
  }

  private buildMockIndex(): RagIndex {
    return {
      model: "mock",
      createdAt: new Date(0).toISOString(),
      chunks: this.docs.readCorpusChunks().map((chunk) => ({ ...chunk, embedding: mockEmbedding(chunk.text) })),
    };
  }
}

export const jsonRagEngine = new JsonRagEngine();
