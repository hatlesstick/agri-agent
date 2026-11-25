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

## pgvector store, real embeddings, 1536 dimensions (2026-11-25)

Model `google/gemini-embedding-001` with `outputDimensionality: 1536`, local pgvector (`pgvector/pgvector:pg17`), all six corpus documents ingested through `ingestDocuments` with the real embeddings adapter.

Ingest:

| Run | Added | Unchanged | Rejected |
| --- | --- | --- | --- |
| First | 19 | 0 | 0 |
| Second (same corpus) | 0 | 19 | 0 |

The second run made no embedding requests for unchanged chunks, as designed.

Comparison with the JSON baseline above, same 15 questions (12 retrieval, 3 off-corpus):

| Measure | pgvector 1536 | JSON 3072 |
| --- | --- | --- |
| recall@3, 12 retrieval questions | 12 / 12 | 12 / 12 |
| top-1 source identical to baseline, retrieval questions | 12 / 12 | (reference) |
| top-3 set identical to baseline, retrieval questions | 12 / 12 | (reference) |
| top-1 identical, off-corpus questions | 2 / 3 | (reference) |
| top score, on-corpus questions | 0.708 – 0.858 | 0.726 – 0.868 |
| top score, off-corpus questions | 0.437 – 0.520 | 0.477 – 0.552 |
| midpoint of worst on-corpus and best off-corpus | 0.614 | 0.638 |

Result against the pass criteria:

- recall@3 stays 12 / 12: met.
- Top-1 source identical on every retrieval question: met (12 / 12).
- Off-corpus differences: one question (glyphosate price) has a different top-1, and one (bread) has a different top-3 set. Neither question has a correct source in the corpus, and the best score is below the threshold in both engines (0.520 and 0.552 against 0.64), so `searchDocs` returns nothing for either engine.
- Score movement below 0.01: not met. The shift is 0.018 on the lowest on-corpus score and 0.031 on the highest off-corpus score. This is expected: the vectors have a different dimension (1536 against 3072), so the two sets of scores are not on the same scale.

Threshold decision: `REAL_MIN_SCORE` stays at 0.64 for now. On the 1536 vectors it still separates the two groups: the lowest on-corpus score is 0.708 and the highest off-corpus score is 0.520. The midpoint of 0.614 would also work, but changing it on this evidence alone would be premature. It will be rechecked when the corpus grows (Stage 2.4c, the embedding comparison).

## Chunk size: sections against packed chunks (2026-11-25)

Same model and dimensions as above (1536), same 15 questions, same retrieval check. Variant A is one chunk per section (on production now). Variant B packs neighbouring short sections of the same document up to 500 characters.

| Measure | A: sections | B: packed to 500 |
| --- | --- | --- |
| Chunks | 19 | 17 |
| Length min / median / max | 232 / 277 / 353 | 232 / 295 / 500 |
| recall@3, 12 retrieval questions | 12 / 12 | 12 / 12 |
| Top score, on-corpus questions | 0.708 – 0.858 | 0.699 – 0.819 |
| Top score, off-corpus questions (max) | 0.520 | 0.523 |
| Gap between the groups | 0.188 | 0.175 |
| Top-1 agreement with A, on-corpus questions | (reference) | 10 / 12 |

Decision: keep one chunk per section. Recall is the same, B separates the two groups slightly less, and B changes the top-1 chunk on two corpus questions because merged chunks mix topics. The 300–500 guidance matters for longer sections; our sections are already 232–353 characters. Revisit when the corpus grows. Twelve questions is a small sample, so this holds for this corpus only.
