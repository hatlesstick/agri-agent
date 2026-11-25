import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { RETRIEVAL_CASES } from "@tests/evals/support/retrieval-cases";
import { DocsRepository } from "@/modules/rag/adapters/DocsRepository";
import { JsonRagEngine } from "@/modules/rag/adapters/JsonRagEngine";
import { LangChainRagEngine } from "@/modules/rag/adapters/LangChainRagEngine";
import { MemoryDocChunkStore } from "@/modules/rag/adapters/MemoryDocChunkStore";
import { ingestDocuments } from "@/modules/rag/ingest/ingest-documents";
import { AiSdkEmbeddings } from "@/modules/rag/embeddings/ai-sdk-embeddings";
import { mockEmbedding } from "@/modules/rag/embeddings/mock-embedding";

const DOCS_DIR = fileURLToPath(new URL("../../../../../data/docs", import.meta.url));
const MOCK_BACKEND = {
  embedMany: async (values: string[]) => values.map((value) => mockEmbedding(value)),
  embed: async (value: string) => mockEmbedding(value),
};

describe("LangChainRagEngine matches the JSON engine on the corpus", () => {
  it("returns the same top-3 chunks with the same scores for every retrieval question", async () => {
    const store = new MemoryDocChunkStore();
    const embeddings = new AiSdkEmbeddings(MOCK_BACKEND);
    const documents = readdirSync(DOCS_DIR).filter((file) => file.endsWith(".md")).map((fileName) => ({
      fileName,
      markdown: readFileSync(join(DOCS_DIR, fileName), "utf8"),
    }));
    const report = await ingestDocuments(documents, store, embeddings);
    expect(report.rejected).toEqual([]);

    const json = new JsonRagEngine(new DocsRepository());
    const langchain = new LangChainRagEngine(store, embeddings);

    for (const { question } of RETRIEVAL_CASES) {
      const expected = await json.search(question, { topK: 3 });
      const actual = await langchain.search(question, { topK: 3 });
      expect(expected, question).toHaveLength(3);
      expect(actual, question).toHaveLength(3);
      expect(actual?.map((hit) => hit.id), question).toEqual(expected?.map((hit) => hit.id));
      actual?.forEach((hit, index) => {
        expect(hit.score, question).toBeCloseTo(expected?.[index].score ?? NaN, 6);
      });
    }
  });
});
