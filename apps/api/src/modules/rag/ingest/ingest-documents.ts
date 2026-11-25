import type { DocChunkStore, StoredChunk } from "@/modules/rag/doc-chunk-store.types";
import { chunkDocument } from "@/modules/rag/domain/chunk-document";
import { contentHash } from "@/modules/rag/domain/content-hash";
import type { DocumentError } from "@/modules/rag/rag.types";

export type DocumentInput = { fileName: string; markdown: string };

export type DocumentEmbedder = { embedDocuments(documents: string[]): Promise<number[][]> };

export type IngestError = DocumentError | "embedding_failed";

export type IngestReport = {
  added: number;
  unchanged: number;
  rejected: Array<{ fileName: string; error: IngestError }>;
};

export async function ingestDocuments(documents: DocumentInput[], store: DocChunkStore, embedder: DocumentEmbedder): Promise<IngestReport> {
  const report: IngestReport = { added: 0, unchanged: 0, rejected: [] };

  for (const { fileName, markdown } of documents) {
    const prepared = await chunkDocument(fileName, markdown);
    if ("error" in prepared) {
      report.rejected.push({ fileName, error: prepared.error });
      continue;
    }

    const hashed = prepared.chunks.map((chunk) => ({ chunk, contentHash: contentHash(chunk.text) }));
    const known = await store.existingHashes(hashed.map((entry) => entry.contentHash));
    const fresh = hashed.filter((entry) => !known.has(entry.contentHash));

    let vectors: number[][] = [];
    if (fresh.length > 0) {
      try {
        vectors = await embedder.embedDocuments(fresh.map((entry) => entry.chunk.text));
      } catch {
        report.rejected.push({ fileName, error: "embedding_failed" });
        continue;
      }
    }

    const stored: StoredChunk[] = fresh.map((entry, index) => ({ ...entry.chunk, contentHash: entry.contentHash, embedding: vectors[index] }));
    report.added += await store.upsertMany(stored);
    report.unchanged += hashed.length - fresh.length;
    await store.pruneDocument(fileName, hashed.map((entry) => entry.contentHash));
  }

  return report;
}
