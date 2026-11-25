import type { DocChunkStore, StoredChunk } from "@/modules/rag/doc-chunk-store.types";
import { chunkDocument } from "@/modules/rag/domain/chunk-document";
import { contentHash } from "@/modules/rag/domain/content-hash";
import type { DocChunk, DocumentError } from "@/modules/rag/rag.types";

export type DocumentInput = { fileName: string; markdown: string };

export type DocumentEmbedder = { embedDocuments(documents: string[]): Promise<number[][]> };

export type IngestError = DocumentError | "embedding_failed";

export type IngestPlan = {
  wouldAdd: number;
  unchanged: number;
  wouldRemove: string[];
  rejected: Array<{ fileName: string; error: IngestError }>;
};

export type IngestReport = {
  added: number;
  unchanged: number;
  rejected: Array<{ fileName: string; error: IngestError }>;
};

type HashedChunk = { chunk: DocChunk; contentHash: string };

async function hashDocument(fileName: string, markdown: string): Promise<{ hashed: HashedChunk[] } | { error: DocumentError }> {
  const prepared = await chunkDocument(fileName, markdown);
  if ("error" in prepared) return { error: prepared.error };
  return { hashed: prepared.chunks.map((chunk) => ({ chunk, contentHash: contentHash(chunk.text) })) };
}

export async function planIngest(documents: DocumentInput[], store: DocChunkStore): Promise<IngestPlan> {
  const plan: IngestPlan = { wouldAdd: 0, unchanged: 0, wouldRemove: [], rejected: [] };
  for (const { fileName, markdown } of documents) {
    const result = await hashDocument(fileName, markdown);
    if ("error" in result) {
      plan.rejected.push({ fileName, error: result.error });
      continue;
    }
    const known = await store.existingHashes(result.hashed.map((entry) => entry.contentHash));
    const fresh = result.hashed.filter((entry) => !known.has(entry.contentHash)).length;
    plan.wouldAdd += fresh;
    plan.unchanged += result.hashed.length - fresh;
  }
  const current = new Set(documents.map((document) => document.fileName));
  plan.wouldRemove = (await store.documentKeys()).filter((key) => !current.has(key));
  return plan;
}

export async function removeDocumentsNotIn(fileNames: string[], store: DocChunkStore): Promise<number> {
  const current = new Set(fileNames);
  let removed = 0;
  for (const key of await store.documentKeys()) {
    if (!current.has(key)) removed += await store.pruneDocument(key, []);
  }
  return removed;
}

export async function ingestDocuments(documents: DocumentInput[], store: DocChunkStore, embedder: DocumentEmbedder): Promise<IngestReport> {
  const report: IngestReport = { added: 0, unchanged: 0, rejected: [] };

  for (const { fileName, markdown } of documents) {
    const result = await hashDocument(fileName, markdown);
    if ("error" in result) {
      report.rejected.push({ fileName, error: result.error });
      continue;
    }

    const hashed = result.hashed;
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
