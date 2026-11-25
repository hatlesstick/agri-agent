import { isMockMode, loadDatabaseUrl } from "@/config";
import { DocsRepository } from "@/modules/rag/adapters/DocsRepository";
import { LangChainRagEngine } from "@/modules/rag/adapters/LangChainRagEngine";
import { MemoryDocChunkStore } from "@/modules/rag/adapters/MemoryDocChunkStore";
import { AiSdkEmbeddings, createEmbeddingBackend } from "@/modules/rag/embeddings/ai-sdk-embeddings";
import { ingestDocuments } from "@/modules/rag/ingest/ingest-documents";
import type { DocChunkStore } from "@/modules/rag/doc-chunk-store.types";
import { openDocChunksRepository } from "@/modules/rag/repositories/DocChunksRepository";
import type { RagEngine } from "@/modules/rag/rag.types";

export function createMockRagEngine(): RagEngine {
  const embeddings = new AiSdkEmbeddings(createEmbeddingBackend(true));
  const store = new MemoryDocChunkStore();
  const engine = new LangChainRagEngine(store, embeddings);
  let ready: Promise<unknown> | undefined;
  return {
    search: async (query, options) => {
      ready ??= ingestDocuments(new DocsRepository().readCorpusDocuments(), store, embeddings);
      await ready;
      return engine.search(query, options);
    },
  };
}

export function createDatabaseRagEngine(store: DocChunkStore): RagEngine {
  return new LangChainRagEngine(store, new AiSdkEmbeddings(createEmbeddingBackend(false)));
}

export function createStandaloneRagEngine(): RagEngine {
  return isMockMode() ? createMockRagEngine() : createDatabaseRagEngine(openDocChunksRepository(loadDatabaseUrl()));
}
