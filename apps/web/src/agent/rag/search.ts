import { embed } from "ai";
import { mockEmbedding } from "@/agent/mock/embedding";
import { EMBEDDING_MODEL, isMockMode } from "@/agent/model";
import { docsRepository } from "@/server/repositories/docs/DocsRepository";
import { rankChunks } from "@/agent/rag/rank";
import type { RagIndex, SearchHit } from "@/server/repositories/docs/docs.types";

export const REAL_MIN_SCORE = 0.64;
export const MOCK_MIN_SCORE = 0.15;

let cachedIndex: RagIndex | null = null;

function buildMockIndex(): RagIndex {
  return {
    model: "mock",
    createdAt: new Date(0).toISOString(),
    chunks: docsRepository.readCorpusChunks().map((chunk) => ({ ...chunk, embedding: mockEmbedding(chunk.text) })),
  };
}

export function usableIndex(index: RagIndex | null, embeddingModel: string): RagIndex | null {
  if (!index || index.chunks.length === 0) {
    console.warn("rag: index is missing or empty; run npm run index");
    return null;
  }
  if (index.model !== embeddingModel) {
    console.warn(`rag: index was built with ${index.model} but queries use ${embeddingModel}; run npm run index`);
    return null;
  }
  return index;
}

function loadIndex(): RagIndex | null {
  if (cachedIndex) return cachedIndex;
  if (isMockMode()) return (cachedIndex = buildMockIndex());
  cachedIndex = usableIndex(docsRepository.readIndex(), EMBEDDING_MODEL);
  return cachedIndex;
}

async function embedQuery(query: string): Promise<number[]> {
  if (isMockMode()) return mockEmbedding(query);
  const { embedding } = await embed({ model: EMBEDDING_MODEL, value: query, maxRetries: 2 });
  return embedding;
}

export async function searchDocs(query: string, { topK }: { topK?: number } = {}): Promise<SearchHit[] | null> {
  const index = loadIndex();
  if (!index) return null;
  const minScore = isMockMode() ? MOCK_MIN_SCORE : REAL_MIN_SCORE;
  return rankChunks(await embedQuery(query), index, { topK, minScore });
}

export function resetSearchIndexCache(): void {
  cachedIndex = null;
}
