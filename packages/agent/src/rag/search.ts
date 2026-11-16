import type { SearchHit } from "@/docs/docs.types";
import { isMockMode } from "@/model";
import type { RagEngine } from "@/ports";
import { DEFAULT_TOP_K } from "@/rag/rank";

export const REAL_MIN_SCORE = 0.64;
export const MOCK_MIN_SCORE = 0.15;

export async function searchDocs(rag: RagEngine, query: string, { topK = DEFAULT_TOP_K }: { topK?: number } = {}): Promise<SearchHit[] | null> {
  const candidates = await rag.search(query, { topK });
  if (!candidates) return null;
  const minScore = isMockMode() ? MOCK_MIN_SCORE : REAL_MIN_SCORE;
  return candidates.filter((candidate) => candidate.score >= minScore).slice(0, topK);
}
