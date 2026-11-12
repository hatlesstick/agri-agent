# agri-agent

[![CI](https://github.com/hatlesstick/agri-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/hatlesstick/agri-agent/actions/workflows/ci.yml)

A tool-using AI agent that decides whether a field can be sprayed, based on the weather forecast.
Built with Next.js and the Vercel AI SDK 7; the first channel is a web chat, plus a structured JSON endpoint.

The model never makes the decision itself: a deterministic rule engine computes `canSpray` and the best
time window, and the model only chooses tools and explains the result in the user's language.

## Features

- Streaming chat with a live activity bar (thinking, choosing a tool, running it, writing), a step timeline and tool-call cards.
- Tools: `getWeather` (Open-Meteo, 48 city-local hours), `sprayWindow` (one day), `sprayOutlook` (all forecast days in one call) and `searchDocs` (RAG over a small spraying-practice corpus with cited sources).
- `POST /api/spray-check`: typed answer `{ city, canSpray, bestWindow, reason }`, reconciled with the rules.
- Local guardrails: request validation, rate limits, prompt-injection screening, history sanitisation, safe markdown.
- Mock model for token-free development, unit tests, evals with pass rates and baselines, Langfuse tracing and scores.

## Knowledge base (RAG)

`data/docs/*.md` holds a small learning corpus on spraying practice (drift, inversions, rainfastness, Delta T,
labels and buffer zones), each document with a `Source:` line. `npm run index` splits it by section, embeds the
chunks with `google/gemini-embedding-001` and writes `data/index.json`. `searchDocs` returns the top 3 passages
above a calibrated similarity threshold (0.64); the agent answers only from them and cites the source, or says it
has no reliable information. No vector database is needed at this size; a pgvector-backed store can replace the
JSON index later without changing the tool.

## Spraying rules

An hour is suitable when wind is 1–4 m/s, temperature is 10–25 °C and there is no precipitation (≥ 0.1 mm)
within 3 hours before and after. A window is a run of consecutive suitable hours; the best window is the
longest one (earliest on a tie). Relative days (`today`, `tomorrow`) are resolved in the city's time zone.

## Getting started

Requirements: Node.js 22+, an AI Gateway API key (Vercel), optionally Langfuse keys.

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key for the real model |
| `AI_MOCK` | `1` = scripted mock model (no tokens), `0` = real model |
| `OPEN_METEO_GEOCODING_URL`, `OPEN_METEO_FORECAST_URL` | Open-Meteo endpoints (https only) |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`, `LANGFUSE_ENVIRONMENT` | Tracing; disabled when keys are empty |
| `RATE_LIMIT_PER_MINUTE`, `GLOBAL_RATE_LIMIT_PER_MINUTE` | Per-client and global request limits |
| `TRUSTED_PROXY_HOPS` | Proxies whose `x-forwarded-for` entry is trusted (`0` locally, `1` on Vercel); required in production |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint, including layer boundary rules |
| `npm test` | Unit and component tests |
| `npm run typecheck` | Next.js route types and `tsc --noEmit` |
| `npm run eval` | Deterministic and mock-model evals (free) |
| `npm run eval:real` | Real-model evals (costs tokens, shares the Gateway rate limit; `EVAL_RUNS=1` for a quick run) |
| `npm run eval:baseline` | Promote the latest eval results to the committed baseline |
| `npm run eval:summary` | Markdown summary of the latest eval run |
| `npm run eval:compare` | Writes [`docs/model-comparison.md`](docs/model-comparison.md) from the latest real-model run per model |
| `npm run index` | Rebuild `data/index.json` embeddings from `data/docs/` (then recalibrate the RAG threshold) |

## Quality gates and CI

| Layer | Command | Where it runs | Cost |
|---|---|---|---|
| Lint, types, unit and component tests | `npm run lint`, `npm run typecheck`, `npm test` | every PR and push to `main` | free |
| Deterministic and mock-model evals | `npm run eval` | every PR and push to `main` (offline: any unstubbed network call fails) | free |
| Production build | `npm run build` | every PR and push to `main` | free |
| Secret scan | gitleaks | every PR and push to `main` | free |
| Real-model evals | `npm run eval:real` or GitHub Actions → Real-model evals (manual, one run at a time) | on demand | tokens |
| Model comparison | `npm run eval:compare` | on demand, after real runs | free |
| Langfuse experiments | `npm run langfuse:experiment` | on demand | tokens |

CI needs no secrets except the Open-Meteo URLs; the manual real-model workflow reads `AI_GATEWAY_API_KEY` and `LANGFUSE_*` from repository secrets and tags traces with `ci`.

## Model comparison

Candidates: `google/gemini-2.5-flash-lite` (default), `openai/gpt-5.4-nano`, and Amazon Bedrock models `amazon/nova-lite` and `amazon/nova-2-lite`, all through AI Gateway (no AWS credentials needed). Every model runs the same eval cases with fixed weather fixtures, so the expected answer is known.

```
EVAL_MODEL=amazon/nova-lite npm run eval:real
npm run eval:compare
```

The table reports pass rate per suite, average estimated cost per case (tokens × Gateway list prices), p50/p95 latency and infrastructure errors; each run's traces and scores are in Langfuse (tag = model). Real runs can also be started from GitHub Actions → Real-model evals.

## Langfuse datasets and experiments

The spray-check eval cases are also a Langfuse dataset (`agri-agent-spray-check`): each item has the question, the weather scenario, a fixed clock and the rule-based expected decision.

```
npm run langfuse:dataset                                         # create the dataset and upsert its items (safe to re-run)
npm run langfuse:experiment -- --model google/gemini-2.5-flash-lite
npm run langfuse:experiment -- --model amazon/nova-lite
AI_MOCK=1 npm run langfuse:experiment -- --dry-run               # local check with the mock model, nothing is sent
```

Each experiment run executes the spray-check agent on every item with the fixture weather and records item scores (`rule_consistency`, `tool_usage`, `steps`, `latency_ms`) and a run score (`pass_rate`); metadata includes the model and the prompt version (last commit of `src/agent/instructions.ts`, or `--prompt-version`).

To compare runs: Langfuse → Datasets → `agri-agent-spray-check` → Runs → select two runs → Compare. The view shows each item's output and scores side by side, plus average scores, latency and cost per run.

## API

### `POST /api/chat`

Body: `{ messages: UIMessage[] }` as sent by `useChat`. Response: UI message stream (SSE).

### `POST /api/spray-check`

```bash
curl -s localhost:3000/api/spray-check \
  -H 'content-type: application/json' \
  -d '{"question":"Can I spray in Lyon tomorrow?"}'
```

```json
{
  "city": "Lyon",
  "canSpray": true,
  "bestWindow": { "from": "2026-11-12T14:00", "to": "2026-11-13T00:00" },
  "reason": "Rain until 10:00; spraying is possible from 14:00."
}
```

| Status | Meaning |
|---|---|
| 200 | Answer; `canSpray`/`bestWindow` always come from the rules |
| 400 | Invalid body (`{ "question": string }`, 1–500 chars) |
| 413 | Body too large |
| 422 | `spray_window_not_called` (not a spraying question) or `blocked_input` (prompt-injection screen) |
| 429 | Rate limited (`Retry-After` header) |
| 502 | `invalid_model_output`: no valid answer and no rule result to fall back to |

## Architecture

```
src/
  app/        Next.js routes only (pages and one-line API route re-exports)
  ui/         frontend, atomic design: atoms, molecules, organisms, templates, pages, hooks, helpers, schemas
  server/     backend API: controllers, services, repositories, guardrails, helpers
  agent/      ToolLoopAgent, instructions, tools, model guardrails, RAG search, spray-check, mock model, telemetry
  shared/     zod-validated env, shared limits, time helpers
tests/
  unit/       unit and component tests mirroring src/
  evals/      deterministic and real-model eval suites, harness, baselines
  fixtures/   shared test fixtures
  support/    test setup (offline guard, DOM cleanup)
```

- Frontend, backend and agent are separate parts with one-way imports, enforced by ESLint.
- Spraying rules live in `SprayWindowService`; the model only explains the result.
- Forms use `react-hook-form` with `zod` schemas; UI logic lives in custom hooks, components only render.

See `CLAUDE.md` for the full conventions: folder rules, naming, component and class patterns, and where new code goes.
