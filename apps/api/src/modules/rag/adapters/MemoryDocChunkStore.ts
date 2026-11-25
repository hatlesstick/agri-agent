import { cosineSimilarity } from "@/modules/rag/domain/cosine-similarity";
import type { ChunkMatch, DocChunkStore, StoredChunk } from "@/modules/rag/doc-chunk-store.types";

export class MemoryDocChunkStore implements DocChunkStore {
  private readonly rows = new Map<string, StoredChunk>();

  async upsertMany(chunks: StoredChunk[]): Promise<number> {
    let inserted = 0;
    for (const chunk of chunks) {
      if (this.rows.has(chunk.contentHash)) continue;
      this.rows.set(chunk.contentHash, chunk);
      inserted += 1;
    }
    return inserted;
  }

  async search(vector: number[], topK: number): Promise<ChunkMatch[]> {
    return [...this.rows.values()]
      .map((row) => ({ chunk: toDocChunk(row), score: cosineSimilarity(vector, row.embedding) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }

  async existingHashes(hashes: string[]): Promise<Set<string>> {
    return new Set(hashes.filter((hash) => this.rows.has(hash)));
  }

  async pruneSource(source: string, keepHashes: string[]): Promise<number> {
    const keep = new Set(keepHashes);
    let removed = 0;
    for (const [hash, row] of this.rows) {
      if (row.source !== source || keep.has(hash)) continue;
      this.rows.delete(hash);
      removed += 1;
    }
    return removed;
  }
}

function toDocChunk({ id, source, title, heading, text, updatedAt }: StoredChunk) {
  return { id, source, title, heading, text, updatedAt };
}
