# RAG comparison

Stage 2.4 results. Each section records one measured run; numbers are copied from the eval output.

## Baseline: JSON index, real embeddings (2026-11-25)

Model `google/gemini-embedding-001` at its default 3072 dimensions, index `apps/api/data/index.json` (19 chunks, built 2026-11-11).

| Measure | Value |
| --- | --- |
| recall@3, 12 retrieval questions | 12 / 12 |
| top score, on-corpus questions | 0.725 – 0.868 |
| top score, off-corpus questions | 0.477 – 0.551 |
| current `REAL_MIN_SCORE` | 0.64 |
| suggested threshold (midpoint of worst on-corpus and best off-corpus) | 0.638 |

## pgvector store, real embeddings: not yet measured

The new store uses `vector(1536)` through `providerOptions.google.outputDimensionality`. Scores at 1536 dimensions are not comparable with the 3072-dimension baseline above, so `REAL_MIN_SCORE` must be recalibrated on the 1536 vectors before the switch (Stage 2.4.8 rule). Pass criteria: recall@3 stays 12 / 12, top-1 source matches the JSON engine on every question, and scores move by less than 0.01 or the change is recorded here.

## Method notes

- The real retrieval eval sends all 15 questions (12 retrieval plus 3 off-corpus) in one batched embedding request. The gateway allows 5 embedding requests per minute, and the earlier one-request-per-question run hit that limit.
- Vectors from the real model are not unit length at 1536 dimensions. Raw norm of one 1536-dimension vector measured 0.69744, so the embeddings adapter normalizes every vector.
