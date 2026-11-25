import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { printEvalReport, recordEval } from "@tests/evals/support/report";
import { MOCK } from "@tests/evals/support/harness";
import { DocsRepository } from "@/modules/rag/adapters/DocsRepository";
import { JsonRagEngine } from "@/modules/rag/adapters/JsonRagEngine";
import { REAL_MIN_SCORE, searchDocs } from "@/modules/rag/domain/search";
import { cosineSimilarity, embedMany } from "ai";
import { existsSync, readFileSync } from "node:fs";
import { EMBEDDING_MODEL } from "@/modules/rag";
import { INDEX_FILE } from "@/modules/rag/adapters/DocsRepository";
import type { RagIndex } from "@/modules/rag/rag.types";
import { chunkMarkdown } from "@/modules/rag/domain/chunk-markdown";

const docsRepository = new DocsRepository();
const jsonRagEngine = new JsonRagEngine(docsRepository);

const SUITE = "rag evals (retrieval)";

import { RETRIEVAL_CASES } from "@tests/evals/support/retrieval-cases";

export const OFF_CORPUS_QUESTIONS = ["What is the price of glyphosate in France?", "Who won the football match yesterday?", "How do I bake bread?"];

describe(SUITE, () => {
  beforeEach(() => jsonRagEngine.reset());
  afterAll(() => printEvalReport(SUITE));

  it("chunks every corpus document by section with its source", () => {
    const chunks = docsRepository.readCorpusChunks();
    const ids = new Set(chunks.map((chunk) => chunk.id));
    const missing = RETRIEVAL_CASES.map((testCase) => testCase.expectedId).filter((id) => !ids.has(id));
    const withoutSource = chunks.filter((chunk) => !chunk.source).map((chunk) => chunk.id);
    recordEval({ suite: SUITE, case: `corpus: ${chunks.length} chunks`, model: "none", passed: missing.length + withoutSource.length ? 0 : 1, runs: 1, failures: [...missing, ...withoutSource].join(", ") });
    expect(missing).toEqual([]);
    expect(withoutSource).toEqual([]);
  });

  it("rejects documents without a source line", () => {
    expect(() => chunkMarkdown("bad.md", "# Title\n\n## Section\n\nText")).toThrow(/Source/);
  });

  it.skipIf(MOCK || !existsSync(INDEX_FILE))("real retrieval: recall@3 and score calibration", async () => {
    const index = JSON.parse(readFileSync(INDEX_FILE, "utf8")) as RagIndex;
    const questions = [...RETRIEVAL_CASES.map((testCase) => testCase.question), ...OFF_CORPUS_QUESTIONS];
    const { embeddings } = await embedMany({ model: EMBEDDING_MODEL, values: questions, maxRetries: 3 });
    const vectorFor = new Map(questions.map((question, position) => [question, embeddings[position]]));
    const topScore = (question: string) => {
      const embedding = vectorFor.get(question);
      if (!embedding) throw new Error(`no embedding for question: ${question}`);
      const ranked = index.chunks
        .map((chunk) => ({ id: chunk.id, score: cosineSimilarity(embedding, chunk.embedding) }))
        .sort((left, right) => right.score - left.score);
      return ranked;
    };

    let found = 0;
    const onCorpusTop: number[] = [];
    const misses: string[] = [];
    for (const testCase of RETRIEVAL_CASES) {
      const ranked = topScore(testCase.question);
      onCorpusTop.push(ranked[0].score);
      if (ranked.slice(0, 3).some((hit) => hit.id === testCase.expectedId)) found += 1;
      else misses.push(`${testCase.expectedId} (top: ${ranked[0].id})`);
    }
    const offCorpusTop: number[] = [];
    for (const question of OFF_CORPUS_QUESTIONS) offCorpusTop.push(topScore(question)[0].score);

    const range = (values: number[]) => `${Math.min(...values).toFixed(3)}–${Math.max(...values).toFixed(3)}`;
    console.log(`\nreal recall@3: ${found}/${RETRIEVAL_CASES.length}`);
    console.log(`top score on-corpus: ${range(onCorpusTop)} | off-corpus: ${range(offCorpusTop)} | current threshold: ${REAL_MIN_SCORE}`);
    console.log(`suggested threshold: ${((Math.min(...onCorpusTop) + Math.max(...offCorpusTop)) / 2).toFixed(3)}`);

    recordEval({ suite: SUITE, case: "real recall@3", model: EMBEDDING_MODEL, passed: found, runs: RETRIEVAL_CASES.length, failures: misses.join(", ") });
    expect(found / RETRIEVAL_CASES.length).toBeGreaterThanOrEqual(0.75);
    expect(Math.max(...offCorpusTop)).toBeLessThan(REAL_MIN_SCORE);
  });

  it.skipIf(!MOCK)("mock retrieval: recall@3 on corpus questions", async () => {
    let found = 0;
    const misses: string[] = [];
    for (const testCase of RETRIEVAL_CASES) {
      const hits = (await searchDocs(jsonRagEngine, testCase.question)) ?? [];
      if (hits.some((hit) => hit.id === testCase.expectedId)) found += 1;
      else misses.push(testCase.expectedId);
    }
    recordEval({ suite: SUITE, case: "mock recall@3", model: "mock", passed: found, runs: RETRIEVAL_CASES.length, failures: misses.join(", ") });
    expect(found / RETRIEVAL_CASES.length).toBeGreaterThanOrEqual(0.75);
  });
});
