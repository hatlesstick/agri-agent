import { Module } from "@nestjs/common";
import { isMockMode } from "@/config";
import { createDatabaseRagEngine, createMockRagEngine } from "@/modules/rag/create-rag-engine";
import { DocChunksRepository } from "@/modules/rag/repositories/DocChunksRepository";
import { RAG_ENGINE } from "@/modules/rag/rag.tokens";

@Module({
  providers: [
    DocChunksRepository,
    {
      provide: RAG_ENGINE,
      inject: [DocChunksRepository],
      useFactory: (store: DocChunksRepository) => (isMockMode() ? createMockRagEngine() : createDatabaseRagEngine(store)),
    },
  ],
  exports: [RAG_ENGINE],
})
export class RagModule {}
