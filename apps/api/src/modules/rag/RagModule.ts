import { Module } from "@nestjs/common";
import { DocsRepository } from "@/modules/rag/adapters/DocsRepository";
import { JsonRagEngine } from "@/modules/rag/adapters/JsonRagEngine";
import { RAG_ENGINE } from "@/modules/rag/rag.tokens";

@Module({
  providers: [{ provide: RAG_ENGINE, useFactory: () => new JsonRagEngine(new DocsRepository()) }],
  exports: [RAG_ENGINE],
})
export class RagModule {}
