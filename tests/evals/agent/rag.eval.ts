import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { printEvalReport, recordEval } from "@tests/evals/report";
import { MOCK } from "@tests/evals/harness";
import { docsRepository } from "@/server/repositories/docs/DocsRepository";
import { REAL_MIN_SCORE, resetSearchIndexCache, searchDocs } from "@/agent/rag/search";
import { embed } from "ai";
import { existsSync, readFileSync } from "node:fs";
import { EMBEDDING_MODEL } from "@/agent/model";
import { INDEX_FILE } from "@/server/repositories/docs/DocsRepository";
import { cosineSimilarity } from "@/agent/rag/rank";
import type { RagIndex } from "@/server/repositories/docs/docs.types";
import { chunkMarkdown } from "@/server/repositories/docs/chunk-markdown";

const SUITE = "rag evals (retrieval)";

export const RETRIEVAL_CASES: Array<{ question: string; expectedId: string }> = [
  { question: "Why should I not spray in dead calm conditions?", expectedId: "temperature-inversions.md#why-it-matters-for-spraying" },
  { question: "What are the signs of a temperature inversion?", expectedId: "temperature-inversions.md#signs-of-an-inversion" },
  { question: "How long must the product stay dry after spraying before rain?", expectedId: "rainfastness.md#rainfastness" },
  { question: "Can I spray on leaves that are wet from dew?", expectedId: "rainfastness.md#wet-foliage" },
  { question: "What increases spray drift?", expectedId: "spray-drift.md#main-factors" },
  { question: "How can I reduce drift with nozzles and boom height?", expectedId: "spray-drift.md#practical-measures" },
  { question: "What Delta T values are good for spraying?", expectedId: "temperature-humidity-delta-t.md#delta-t" },
  { question: "Why do droplets evaporate in hot dry weather?", expectedId: "temperature-humidity-delta-t.md#evaporation-of-droplets" },
  { question: "Do I need buffer zones next to rivers and ditches?", expectedId: "labels-and-buffer-zones.md#buffer-zones-and-sensitive-areas" },
  { question: "What records should I keep after spraying?", expectedId: "labels-and-buffer-zones.md#protective-equipment-and-records" },
  { question: "Which wind direction is safe for spraying near houses?", expectedId: "weather-conditions-for-spraying.md#wind-direction" },
  { question: "Is it ok to spray when it is very hot?", expectedId: "weather-conditions-for-spraying.md#temperature" },
];

export const OFF_CORPUS_QUESTIONS = ["What is the price of glyphosate in France?", "Who won the football match yesterday?", "How do I bake bread?"];

describe(SUITE, () => {
  beforeEach(() => resetSearchIndexCache());
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
    const topScore = async (question: string) => {
      const { embedding } = await embed({ model: EMBEDDING_MODEL, value: question, maxRetries: 3 });
      const ranked = index.chunks
        .map((chunk) => ({ id: chunk.id, score: cosineSimilarity(embedding, chunk.embedding) }))
        .sort((left, right) => right.score - left.score);
      return ranked;
    };

    let found = 0;
    const onCorpusTop: number[] = [];
    const misses: string[] = [];
    for (const testCase of RETRIEVAL_CASES) {
      const ranked = await topScore(testCase.question);
      onCorpusTop.push(ranked[0].score);
      if (ranked.slice(0, 3).some((hit) => hit.id === testCase.expectedId)) found += 1;
      else misses.push(`${testCase.expectedId} (top: ${ranked[0].id})`);
    }
    const offCorpusTop: number[] = [];
    for (const question of OFF_CORPUS_QUESTIONS) offCorpusTop.push((await topScore(question))[0].score);

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
      const hits = (await searchDocs(testCase.question)) ?? [];
      if (hits.some((hit) => hit.id === testCase.expectedId)) found += 1;
      else misses.push(testCase.expectedId);
    }
    recordEval({ suite: SUITE, case: "mock recall@3", model: "mock", passed: found, runs: RETRIEVAL_CASES.length, failures: misses.join(", ") });
    expect(found / RETRIEVAL_CASES.length).toBeGreaterThanOrEqual(0.75);
  });
});
