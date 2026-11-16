import type { SearchHit } from "@/modules/rag/docs.types";
import { isMockMode } from "@/config";
import type { RagEngine } from "@/modules/rag/rag.types";
import { DEFAULT_TOP_K } from "@/modules/rag/rank";

export const REAL_MIN_SCORE = 0.64;
export const MOCK_MIN_SCORE = 0.15;

export async function searchDocs(rag: RagEngine, query: string, { topK = DEFAULT_TOP_K }: { topK?: number } = {}): Promise<SearchHit[] | null> {
  const candidates = await rag.search(query, { topK });
  if (!candidates) return null;
  const minScore = isMockMode() ? MOCK_MIN_SCORE : REAL_MIN_SCORE;
  return candidates
    .filter((candidate) => candidate.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}
