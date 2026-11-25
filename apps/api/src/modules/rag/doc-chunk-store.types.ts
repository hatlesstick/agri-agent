import type { DocChunk } from "@/modules/rag/rag.types";

export type StoredChunk = DocChunk & { contentHash: string; embedding: number[] };

export type ChunkMatch = { chunk: DocChunk; score: number };

export type DocChunkStore = {
  upsertMany(chunks: StoredChunk[]): Promise<number>;
  search(vector: number[], topK: number): Promise<ChunkMatch[]>;
  existingHashes(hashes: string[]): Promise<Set<string>>;
  pruneSource(source: string, keepHashes: string[]): Promise<number>;
};
