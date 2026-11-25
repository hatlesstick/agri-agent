import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DocChunksRepository } from "@/modules/rag/repositories/DocChunksRepository";
import { ingestDocuments, type DocumentEmbedder } from "@/modules/rag/ingest/ingest-documents";
import { databaseHandle, testDatabase, type TestDatabase } from "@tests/support/test-database";

const DOC = "# Spray drift\n\nSource: FAO 2001\nUpdated: 2026-11-25\n\n## Wind\n\nWind above 4 m/s raises drift.\n\n## Nozzles\n\nUse coarse droplets.";

const embedder: DocumentEmbedder = {
  embedDocuments: async (documents) => documents.map((text) => [text.length, 1, 0, 0, ...new Array<number>(1532).fill(0)]),
};

describe.skipIf(!process.env.TEST_DATABASE_URL)("ingestDocuments against real pgvector", () => {
  let test: TestDatabase;
  let store: DocChunksRepository;

  beforeAll(async () => {
    test = await testDatabase();
    store = new DocChunksRepository(databaseHandle(test.db));
  });

  beforeEach(async () => {
    await test.db.execute(sql`truncate table doc_chunks`);
  });

  afterAll(async () => {
    await test.close();
  });

  it("a second run over the same corpus writes nothing and keeps every chunk", async () => {
    const first = await ingestDocuments([{ fileName: "spray.md", markdown: DOC }], store, embedder);
    const second = await ingestDocuments([{ fileName: "spray.md", markdown: DOC }], store, embedder);
    expect(first).toEqual({ added: 2, unchanged: 0, rejected: [] });
    expect(second).toEqual({ added: 0, unchanged: 2, rejected: [] });
    const rows = await store.search(Array.from({ length: 1536 }, (_, index) => (index === 0 ? 1 : 0)), 10);
    expect(rows).toHaveLength(2);
  });
});
