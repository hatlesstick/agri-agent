export type Chunk = { id: string; source: string; title: string; heading: string; text: string };

export type IndexedChunk = Chunk & { embedding: number[] };

export type RagIndex = { model: string; createdAt: string; chunks: IndexedChunk[] };

export type SearchHit = { id: string; source: string; title: string; heading: string; text: string; score: number };

export type RagCandidate = SearchHit;

export type RagEngine = { search(query: string, options: { topK: number }): Promise<RagCandidate[] | null> };
