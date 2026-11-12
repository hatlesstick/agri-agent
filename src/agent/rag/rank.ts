import type { RagIndex, SearchHit } from "@/server/repositories/docs/docs.types";

export const DEFAULT_TOP_K = 3;

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

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
