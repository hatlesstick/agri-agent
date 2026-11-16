import { Logger } from "@nestjs/common";
import { embed } from "ai";
import { DocsRepository } from "@/modules/rag/adapters/DocsRepository";
import type { RagIndex } from "@/modules/rag/rag.types";
import { isMockMode } from "@/config";
import { EMBEDDING_MODEL } from "@/modules/rag/embeddings/embedding-model";
import { mockEmbedding } from "@/modules/rag/embeddings/mock-embedding";
import type { RagCandidate, RagEngine } from "@/modules/rag/rag.types";
import { rankChunks } from "@/modules/rag/domain/rank";

const logger = new Logger("JsonRagEngine");

export function usableIndex(index: RagIndex | null, embeddingModel: string): RagIndex | null {
  if (!index || index.chunks.length === 0) {
    logger.warn("rag: index is missing or empty; run pnpm index");
    return null;
  }
  if (index.model !== embeddingModel) {
    logger.warn(`rag: index was built with ${index.model} but queries use ${embeddingModel}; run pnpm index`);
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
  private indexLoaded = false;

  constructor(private readonly docs: DocsRepository = new DocsRepository()) {}

  async search(query: string, { topK }: { topK: number }): Promise<RagCandidate[] | null> {
    const index = this.loadIndex();
    if (!index) return null;
    return rankChunks(await embedQuery(query), index, { topK, minScore: Number.NEGATIVE_INFINITY });
  }

  reset(): void {
    this.cachedIndex = null;
    this.indexLoaded = false;
  }

  private loadIndex(): RagIndex | null {
    if (this.indexLoaded) return this.cachedIndex;
    this.cachedIndex = isMockMode() ? this.buildMockIndex() : usableIndex(this.docs.readIndex(), EMBEDDING_MODEL);
    this.indexLoaded = true;
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

