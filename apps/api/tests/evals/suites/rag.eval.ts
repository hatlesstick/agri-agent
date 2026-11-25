import { afterAll, describe, expect, it } from "vitest";
import { embedMany } from "ai";
import { printEvalReport, recordEval } from "@tests/evals/support/report";
import { MOCK } from "@tests/evals/support/harness";
import { RETRIEVAL_CASES } from "@tests/evals/support/retrieval-cases";
import { DocsRepository } from "@/modules/rag/adapters/DocsRepository";
import { LangChainRagEngine } from "@/modules/rag/adapters/LangChainRagEngine";
import { MemoryDocChunkStore } from "@/modules/rag/adapters/MemoryDocChunkStore";
import { REAL_MIN_SCORE, searchDocs } from "@/modules/rag/domain/search";
import { chunkDocument } from "@/modules/rag/domain/chunk-document";
import { contentHash } from "@/modules/rag/domain/content-hash";
import { normalizeVector } from "@/modules/rag/domain/normalize-vector";
import { createEmbeddingBackend, EMBEDDING_DIMENSIONS } from "@/modules/rag/embeddings/ai-sdk-embeddings";
import { EMBEDDING_MODEL } from "@/modules/rag/embeddings/embedding-model";
import { createMockRagEngine } from "@/modules/rag/create-rag-engine";
import type { StoredChunk } from "@/modules/rag/doc-chunk-store.types";

const SUITE = "rag evals (retrieval)";

export const OFF_CORPUS_QUESTIONS = ["What is the price of glyphosate in France?", "Who won the football match yesterday?", "How do I bake bread?"];

async function corpusChunks() {
  const documents = new DocsRepository().readCorpusDocuments();
  const chunks = [];
  for (const document of documents) {
    const result = await chunkDocument(document.fileName, document.markdown);
    if ("error" in result) throw new Error(`${document.fileName}: ${result.error}`);
    chunks.push(...result.chunks);
  }
  return chunks;
}

describe(SUITE, () => {
  afterAll(() => printEvalReport(SUITE));

  it("chunks every corpus document by section with its source", async () => {
    const chunks = await corpusChunks();
    const ids = new Set(chunks.map((chunk) => chunk.id));
    const missing = RETRIEVAL_CASES.map((testCase) => testCase.expectedId).filter((id) => !ids.has(id));
    const withoutSource = chunks.filter((chunk) => !chunk.source).map((chunk) => chunk.id);
    recordEval({ suite: SUITE, case: `corpus: ${chunks.length} chunks`, model: "none", passed: missing.length + withoutSource.length ? 0 : 1, runs: 1, failures: [...missing, ...withoutSource].join(", ") });
    expect(missing).toEqual([]);
    expect(withoutSource).toEqual([]);
  });

  it("rejects documents without a source line", async () => {
    expect(await chunkDocument("bad.md", "# Title\n\nUpdated: 2026-11-25\n\n## Section\n\nText")).toEqual({ error: "missing_source" });
  });

  it.skipIf(MOCK)("real retrieval: recall@3 and score calibration on the pgvector engine's embeddings", async () => {
    const backend = createEmbeddingBackend(false);
    const chunks = await corpusChunks();
    const vectors = await backend.embedMany(chunks.map((chunk) => chunk.text));
    const store = new MemoryDocChunkStore();
    const stored: StoredChunk[] = chunks.map((chunk, position) => ({
      ...chunk,
      contentHash: contentHash(chunk.text),
      embedding: normalizeVector(vectors[position]),
    }));
    await store.upsertMany(stored);

    const questions = [...RETRIEVAL_CASES.map((testCase) => testCase.question), ...OFF_CORPUS_QUESTIONS];
    const { embeddings } = await embedMany({ model: EMBEDDING_MODEL, values: questions, maxRetries: 3, providerOptions: { google: { outputDimensionality: EMBEDDING_DIMENSIONS } } });
    const vectorFor = new Map(questions.map((question, position) => [question, normalizeVector(embeddings[position])]));
    const engine = new LangChainRagEngine(store, {
      embedQuery: async (question) => {
        const vector = vectorFor.get(question);
        if (!vector) throw new Error(`no embedding for question: ${question}`);
        return vector;
      },
    });

    let found = 0;
    const onCorpusTop: number[] = [];
    const misses: string[] = [];
    for (const testCase of RETRIEVAL_CASES) {
      const hits = (await engine.search(testCase.question, { topK: 3 })) ?? [];
      onCorpusTop.push(hits[0]?.score ?? 0);
      if (hits.some((hit) => hit.id === testCase.expectedId)) found += 1;
      else misses.push(`${testCase.expectedId} (top: ${hits[0]?.id ?? "none"})`);
    }
    const offCorpusTop: number[] = [];
    for (const question of OFF_CORPUS_QUESTIONS) offCorpusTop.push((await engine.search(question, { topK: 1 }))?.[0]?.score ?? 0);

    const range = (values: number[]) => `${Math.min(...values).toFixed(3)}–${Math.max(...values).toFixed(3)}`;
    console.log(`\nreal recall@3: ${found}/${RETRIEVAL_CASES.length}`);
    console.log(`top score on-corpus: ${range(onCorpusTop)} | off-corpus: ${range(offCorpusTop)} | current threshold: ${REAL_MIN_SCORE}`);
    console.log(`suggested threshold: ${((Math.min(...onCorpusTop) + Math.max(...offCorpusTop)) / 2).toFixed(3)}`);

    recordEval({ suite: SUITE, case: "real recall@3", model: EMBEDDING_MODEL, passed: found, runs: RETRIEVAL_CASES.length, failures: misses.join(", ") });
    expect(found / RETRIEVAL_CASES.length).toBeGreaterThanOrEqual(0.75);
    expect(Math.max(...offCorpusTop)).toBeLessThan(REAL_MIN_SCORE);
  });

  it.skipIf(!MOCK)("mock retrieval: recall@3 on corpus questions", async () => {
    const engine = createMockRagEngine();
    let found = 0;
    const misses: string[] = [];
    for (const testCase of RETRIEVAL_CASES) {
      const hits = (await searchDocs(engine, testCase.question)) ?? [];
      if (hits.some((hit) => hit.id === testCase.expectedId)) found += 1;
      else misses.push(testCase.expectedId);
    }
    recordEval({ suite: SUITE, case: "mock recall@3", model: "mock", passed: found, runs: RETRIEVAL_CASES.length, failures: misses.join(", ") });
    expect(found / RETRIEVAL_CASES.length).toBeGreaterThanOrEqual(0.75);
  });
});
