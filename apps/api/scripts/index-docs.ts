import "reflect-metadata";
import { isMockMode, loadDatabaseUrl } from "@/config";
import { LazyDatabase } from "@/database";
import { DocsRepository } from "@/modules/rag/adapters/DocsRepository";
import { DocChunksRepository } from "@/modules/rag/repositories/DocChunksRepository";
import { AiSdkEmbeddings, createEmbeddingBackend } from "@/modules/rag/embeddings/ai-sdk-embeddings";
import { ingestDocuments, planIngest, removeDocumentsNotIn } from "@/modules/rag/ingest/ingest-documents";

const CHECK_ONLY = process.argv.includes("--check");

async function main(): Promise<void> {
  const database = new LazyDatabase(loadDatabaseUrl());
  const store = new DocChunksRepository(database);
  const documents = new DocsRepository().readCorpusDocuments();

  try {
    if (CHECK_ONLY) {
      const plan = await planIngest(documents, store);
      console.log(JSON.stringify(plan, null, 2));
      return;
    }
    const embeddings = new AiSdkEmbeddings(createEmbeddingBackend(isMockMode()));
    const report = await ingestDocuments(documents, store, embeddings);
    const removed = await removeDocumentsNotIn(
      documents.map((document) => document.fileName),
      store,
    );
    console.log(JSON.stringify({ ...report, removedChunks: removed }, null, 2));
    if (report.rejected.length > 0) process.exitCode = 1;
  } finally {
    await database.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
