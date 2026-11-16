# agri-agent

[![CI](https://github.com/hatlesstick/agri-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/hatlesstick/agri-agent/actions/workflows/ci.yml)

A tool-using AI agent that decides whether a field can be sprayed, based on the weather forecast.
A Next.js web UI on Vercel talks to a NestJS API (Docker) that owns the agent, built with the Vercel AI SDK 7; the first channel is a web chat, plus a structured JSON endpoint.

The model never makes the decision itself: a deterministic rule engine computes `canSpray` and the best
time window, and the model only chooses tools and explains the result in the user's language.

## Features

- Streaming chat with a live activity bar (thinking, choosing a tool, running it, writing), a step timeline and tool-call cards.
- Tools: `getWeather` (Open-Meteo, 48 city-local hours), `sprayWindow` (one day), `sprayOutlook` (all forecast days in one call) and `searchDocs` (RAG over a small spraying-practice corpus with cited sources).
- `POST /spray-check` (browser: `/api/spray-check`): typed answer `{ city, canSpray, bestWindow, reason }`, reconciled with the rules.
- Guardrails: request validation, proxy secret, rate limits, prompt-injection screening, history sanitisation, safe markdown; RFC 9457 problem details for every HTTP error.
- Swagger / OpenAPI for the API contract (`/docs`, committed `apps/api/openapi.json` checked in CI); pino JSON logs with request ids; health endpoints.
- Mock model for token-free development, unit tests, evals with pass rates and baselines, Langfuse tracing and scores.

## Knowledge base (RAG)

`apps/api/data/docs/*.md` holds a small learning corpus on spraying practice (drift, inversions, rainfastness, Delta T,
labels and buffer zones), each document with a `Source:` line. `pnpm index` splits it by section, embeds the
chunks with `google/gemini-embedding-001` and writes `apps/api/data/index.json`. `searchDocs` returns the top 3 passages
above a calibrated similarity threshold (0.64); the agent answers only from them and cites the source, or says it
has no reliable information. No vector database is needed at this size; a pgvector-backed store can replace the
JSON index later without changing the tool.

## Spraying rules

An hour is suitable when wind is 1–4 m/s, temperature is 10–25 °C and there is no precipitation (≥ 0.1 mm)
within 3 hours before and after. A window is a run of consecutive suitable hours; the best window is the
longest one (earliest on a tie). Relative days (`today`, `tomorrow`) are resolved in the city's time zone.

## Getting started

Requirements: Node.js 22+, pnpm (via corepack), Docker (optional, for the API container), an AI Gateway API key for the real model, optionally Langfuse keys.

pnpm + Turborepo monorepo: `apps/web` (Next.js UI), `apps/api` (NestJS API with the agent), `packages/shared` (`@agri/shared` contracts).

```bash
corepack enable
pnpm install
cp .env.example .env                                # POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB for the Compose database
cp apps/api/.env.example apps/api/.env              # API, evals and scripts; DATABASE_URL=postgres://USER:PASSWORD@127.0.0.1:5432/DB
cp apps/web/.env.example apps/web/.env.local        # API_ORIGIN=http://localhost:4000 and the same PROXY_AUTH_SECRET
pnpm db:up && pnpm --filter @agri/api db:migrate    # start Postgres and apply migrations
pnpm --filter @agri/api db:seed                     # optional demo user with two fields
pnpm dev                                            # starts the db if needed; API on http://localhost:4000 (Swagger: /docs), web on http://localhost:3000
```

The `.env.example` files list every key with empty values; CI takes the values from GitHub secrets, locally you fill them in. Minimal local API values: `AI_MOCK=1`, the two Open-Meteo URLs (`https://geocoding-api.open-meteo.com/v1/search`, `https://api.open-meteo.com/v1/forecast`), `PROXY_AUTH_SECRET` (≥ 32 chars, optional outside production).

Docker:

```bash
docker compose up --build                 # API in production mode on :4000 (needs PROXY_AUTH_SECRET and TRUSTED_PROXY_HOPS in apps/api/.env)
docker compose --profile cache up         # plus Redis on 127.0.0.1:6379 (reserved for the cache adapter)
```

All commands run from the repo root; Turborepo builds `@agri/shared` before the apps. One workspace only: `pnpm --filter @agri/api <script>`.

Vercel (web only): Root Directory `apps/web`, install `pnpm install`, build `cd ../.. && pnpm turbo run build --filter=@agri/web`, env `API_ORIGIN` (read at build time by the rewrites) and `PROXY_AUTH_SECRET`. Until the API is deployed (Stage 2.2) the deployed web has no backend.

| Variable (`apps/api`) | Purpose |
|---|---|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key for the real model |
| `AI_MOCK` | `1` = scripted mock model (no tokens), `0` = real model |
| `OPEN_METEO_GEOCODING_URL`, `OPEN_METEO_FORECAST_URL` | Open-Meteo endpoints (https only) |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`, `LANGFUSE_ENVIRONMENT` | Tracing; disabled when keys are empty |
| `RATE_LIMIT_PER_MINUTE`, `GLOBAL_RATE_LIMIT_PER_MINUTE` | Per-client and global request limits |
| `TRUSTED_PROXY_HOPS` | Proxies in front of the API (`0` locally, `1` behind Caddy); required in production |
| `PROXY_AUTH_SECRET` | Shared secret the web proxy sends as `x-proxy-auth`; required in production |
| `DATABASE_URL` | Postgres connection string (required) |
| `PORT`, `LOG_LEVEL`, `SWAGGER_ENABLED`, `CACHE_DRIVER`, `REDIS_URL` | Port (4000), pino level, Swagger in production, cache driver (`memory`; `redis` reserved) |

| Variable (`apps/web`) | Purpose |
|---|---|
| `API_ORIGIN` | API base URL for the `/api/*` rewrites (build time) |
| `PROXY_AUTH_SECRET` | Same secret as the API; added by `proxy.ts` |

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint per workspace, including import boundary rules |
| `pnpm test` | Unit and component tests |
| `pnpm typecheck` | `tsc --noEmit` per workspace (+ Next.js route types) |
| `pnpm eval` | Deterministic and mock-model evals (free) |
| `pnpm eval:real` | Real-model evals (costs tokens, shares the Gateway rate limit; `EVAL_RUNS=1` for a quick run) |
| `pnpm eval:baseline` | Promote the latest eval results to the committed baseline |
| `pnpm eval:summary` | Markdown summary of the latest eval run |
| `pnpm eval:compare` | Writes [`docs/model-comparison.md`](docs/model-comparison.md) from the latest real-model run per model |
| `pnpm openapi` | Regenerates `apps/api/openapi.json` (commit it with API changes) |
| `pnpm index` | Rebuild `apps/api/data/index.json` embeddings from `data/docs/` (then recalibrate the RAG threshold) |

## Quality gates and CI

| Layer | Command | Where it runs | Cost |
|---|---|---|---|
| Lint, types, unit and component tests | `pnpm lint`, `pnpm typecheck`, `pnpm test` | every PR and push to `main` | free |
| Deterministic and mock-model evals | `pnpm eval` | every PR and push to `main` (offline: any unstubbed network call fails) | free |
| Production build | `pnpm build` | every PR and push to `main` | free |
| Secret scan | gitleaks | every PR and push to `main` | free |
| Real-model evals | `pnpm eval:real` or GitHub Actions → Real-model evals (manual, one run at a time) | on demand | tokens |
| Model comparison | `pnpm eval:compare` | on demand, after real runs | free |
| Langfuse experiments | `pnpm langfuse:experiment` | on demand | tokens |

CI needs no secrets except the Open-Meteo URLs; the manual real-model workflow reads `AI_GATEWAY_API_KEY` and `LANGFUSE_*` from repository secrets and tags traces with `ci`.

## Model comparison

Candidates: `google/gemini-2.5-flash-lite` (default), `openai/gpt-5.4-nano` (fallback) and `deepseek/deepseek-v4-flash`, all through AI Gateway. On the Gateway Free Tier only Gemini and GPT are available; DeepSeek and Amazon Bedrock models (`amazon/nova-lite`, `amazon/nova-2-lite`, priced in `tests/evals/model-pricing.ts`) need paid credits. Every model runs the same eval cases with fixed weather fixtures, so the expected answer is known.

```
EVAL_MODEL=openai/gpt-5.4-nano pnpm eval:real
pnpm eval:compare
```

The table reports pass rate per suite, average estimated cost per case (tokens × Gateway list prices), p50/p95 latency and infrastructure errors; each run's traces and scores are in Langfuse (tag = model). Real runs can also be started from GitHub Actions → Real-model evals.

## Langfuse datasets and experiments

The spray-check eval cases are also a Langfuse dataset (`agri-agent-spray-check`): each item has the question, the weather scenario, a fixed clock and the rule-based expected decision.

```
pnpm langfuse:dataset                                         # create the dataset and upsert its items (safe to re-run)
pnpm langfuse:experiment --model google/gemini-2.5-flash-lite
pnpm langfuse:experiment --model openai/gpt-5.4-nano
AI_MOCK=1 pnpm langfuse:experiment --dry-run               # local check with the mock model, nothing is sent
```

Each experiment run executes the spray-check agent on every item with the fixture weather and records item scores (`rule_consistency`, `tool_usage`, `steps`, `latency_ms`) and a run score (`pass_rate`); metadata includes the model and the prompt version (last commit of `apps/api/src/modules/agent/core/instructions.ts`, or `--prompt-version`).

To compare runs: Langfuse → Datasets → `agri-agent-spray-check` → Runs → select two runs → Compare. The view shows each item's output and scores side by side, plus average scores, latency and cost per run.

## API

The NestJS API serves the contract documented in Swagger (`http://localhost:4000/docs`, JSON at `/openapi.json`, committed as `apps/api/openapi.json`). The browser calls it as `/api/*` through the web app's rewrites; direct calls need `x-proxy-auth` when `PROXY_AUTH_SECRET` is set.

### `POST /chat`

Body: `{ messages: UIMessage[] }` as sent by `useChat`. Response: AI SDK UI message stream (SSE). A prompt-injection attempt is answered with a refusal stream (200).

### `POST /spray-check`

```bash
curl -s localhost:4000/spray-check \
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

Errors are RFC 9457 problem details (`application/problem+json`) with a stable `code`:

```json
{ "type": "about:blank", "title": "Too Many Requests", "status": 429, "instance": "<request id>", "code": "rate_limited" }
```

| Status | `code` |
|---|---|
| 400 | `invalid_request` (body must be `{ "question": string }`, 1–500 chars) |
| 403 | `forbidden` (missing or wrong `x-proxy-auth`) |
| 413 | `payload_too_large` |
| 422 | `spray_window_not_called` (not a spraying question), `blocked_input` (prompt-injection screen) |
| 429 | `rate_limited` (`Retry-After` header) |
| 502 | `invalid_model_output` (no valid answer and no rule result to fall back to) |
| 503 / 504 / 500 | `model_busy` / `model_timeout` / `internal_error` |

`GET /health/live` reports liveness; `GET /health/ready` checks the database and answers 503 (`database: "down"`) when it is unreachable.

## Architecture

```
browser ─▶ apps/web (Next.js on Vercel, UI only)
             │  /api/*  rewrite + proxy.ts (x-proxy-auth, x-client-ip)
             ▼
          apps/api (NestJS in Docker)
             common/   errors (RFC 9457) · http guards · rate limit · cache port · clock · openapi
             modules/  chat · spray-check ─▶ agent (ToolLoopAgent, tools, guardrails, workflows)
                                              ├─ weather (Open-Meteo adapter, CacheStore)
                                              ├─ rag (searchDocs over a RagEngine adapter)
                                              └─ spray-rules (deterministic assessSprayDay)
packages/shared   zod contracts: requests, responses, errors, tool and chat message types
```

- The web app has no backend code; every HTTP contract lives in `@agri/shared` and is documented by the API's OpenAPI document.
- Feature modules expose a public `index.ts`; dependencies flow agent → weather / rag / spray-rules; external services sit behind ports (`WeatherPort`, `RagEngine`, `CacheStore`) with adapters injected by Nest.
- Spraying rules live in the pure function `assessSprayDay`; the model only explains the result.
- Forms use `react-hook-form` with `zod` schemas; UI logic lives in custom hooks, components only render.

See `CLAUDE.md` for the full conventions: folder rules, naming, component and class patterns, and where new code goes.
