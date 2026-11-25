import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RETRIEVAL_CASES } from "@tests/evals/support/retrieval-cases";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";
import { LangChainRagEngine } from "@/modules/rag/adapters/LangChainRagEngine";
import { MemoryDocChunkStore } from "@/modules/rag/adapters/MemoryDocChunkStore";
import { DocChunksRepository } from "@/modules/rag/repositories/DocChunksRepository";
import { ingestDocuments } from "@/modules/rag/ingest/ingest-documents";
import { AiSdkEmbeddings, createEmbeddingBackend } from "@/modules/rag/embeddings/ai-sdk-embeddings";

const DOCS_DIR = fileURLToPath(new URL("../../../../data/docs", import.meta.url));

describe.skipIf(!process.env.TEST_DATABASE_URL)("LangChainRagEngine over real pgvector", () => {
  let test: TestDatabase;

  beforeAll(async () => {
    test = await testDatabase();
  });

  beforeEach(async () => {
    await test.db.execute(sql`truncate table doc_chunks`);
  });

  afterAll(async () => {
    await test.close();
  });

  it("returns the same top-3 chunks as the in-memory store for every retrieval question", async () => {
    const embeddings = new AiSdkEmbeddings(createEmbeddingBackend(true));
    const documents = readdirSync(DOCS_DIR).filter((file) => file.endsWith(".md")).map((fileName) => ({
      fileName,
      markdown: readFileSync(join(DOCS_DIR, fileName), "utf8"),
    }));
    const pg = new DocChunksRepository(databaseHandle(test.db));
    const memory = new MemoryDocChunkStore();
    await ingestDocuments(documents, pg, embeddings);
    await ingestDocuments(documents, memory, embeddings);

    const onPg = new LangChainRagEngine(pg, embeddings);
    const inMemory = new LangChainRagEngine(memory, embeddings);
    for (const { question } of RETRIEVAL_CASES) {
      const expected = await inMemory.search(question, { topK: 3 });
      const actual = await onPg.search(question, { topK: 3 });
      expect(expected, question).toHaveLength(3);
      expect(actual?.map((hit) => hit.id), question).toEqual(expected?.map((hit) => hit.id));
      actual?.forEach((hit, index) => {
        expect(hit.score, question).toBeCloseTo(expected?.[index].score ?? NaN, 4);
      });
    }
  });
});
