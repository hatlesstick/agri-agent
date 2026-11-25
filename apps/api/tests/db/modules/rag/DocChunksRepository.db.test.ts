import { describe } from "vitest";
import { sql } from "drizzle-orm";
import { describeDocChunkStore, type StoreUnderTest } from "@tests/support/doc-chunk-store-contract";
import { testDatabase, databaseHandle } from "@tests/support/test-database";
import { DocChunksRepository } from "@/modules/rag/repositories/DocChunksRepository";

describe.skipIf(!process.env.TEST_DATABASE_URL)("DocChunksRepository against real pgvector", () => {
  describeDocChunkStore("DocChunksRepository", async (): Promise<StoreUnderTest> => {
    const test = await testDatabase();
    const store = new DocChunksRepository(databaseHandle(test.db));
    return {
      store,
      reset: async () => {
        await test.db.execute(sql`truncate table doc_chunks`);
      },
      close: test.close,
    };
  });
});
