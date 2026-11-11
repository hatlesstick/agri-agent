import { existsSync, readFileSync } from "node:fs";
import { embed } from "ai";
import { mockEmbedding } from "@/agent/mock/embedding";
import { EMBEDDING_MODEL, isMockMode } from "@/agent/model";
import { INDEX_FILE, readCorpusChunks } from "@/agent/rag/corpus";
import { rankChunks } from "@/domain/rag/search";
import type { RagIndex, SearchHit } from "@/domain/rag/types";

export const REAL_MIN_SCORE = 0.55;
export const MOCK_MIN_SCORE = 0.15;

let cachedIndex: RagIndex | null = null;

function buildMockIndex(): RagIndex {
  return {
    model: "mock",
    createdAt: new Date(0).toISOString(),
    chunks: readCorpusChunks().map((chunk) => ({ ...chunk, embedding: mockEmbedding(chunk.text) })),
  };
}

function loadIndex(): RagIndex | null {
  if (cachedIndex) return cachedIndex;
  if (isMockMode()) return (cachedIndex = buildMockIndex());
  if (!existsSync(INDEX_FILE)) return null;
  return (cachedIndex = JSON.parse(readFileSync(INDEX_FILE, "utf8")) as RagIndex);
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
