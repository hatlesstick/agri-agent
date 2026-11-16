import type { SearchHit } from "@/modules/rag/docs.types";

export type RagCandidate = SearchHit;

export type RagEngine = { search(query: string, options: { topK: number }): Promise<RagCandidate[] | null> };
