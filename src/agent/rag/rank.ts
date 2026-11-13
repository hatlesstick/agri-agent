import { cosineSimilarity } from "ai";
import type { RagIndex, SearchHit } from "@/server/repositories/docs/docs.types";

export const DEFAULT_TOP_K = 3;

export function rankChunks(
  queryEmbedding: number[],
  index: RagIndex,
  { topK = DEFAULT_TOP_K, minScore }: { topK?: number; minScore: number },
): SearchHit[] {
  return index.chunks
    .map(({ embedding, ...chunk }) => ({ ...chunk, score: cosineSimilarity(queryEmbedding, embedding) }))
    .filter((hit) => hit.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}
