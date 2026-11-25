# Engineering notes

Details behind the README: decision rules, guardrails, quality gates, configuration and the HTTP API. The live contract is Swagger at `/docs`.

## Code decides, the model explains

- `canSpray` and `bestWindow` come from the pure function `assessSprayDay`. The model picks tools and phrases the reason; it never recomputes or overrides a decision. In `/spray-check` the code reconciles the model's answer with the rule result, and the code wins.
- Large data never flows through the model: it passes short parameters (`city`, `date`) and the tools fetch the data themselves.
- Writes (planned for Stage 2.5) follow **propose → human approve → execute**: the model can only create a pending action, and code executes it after approval.

**Spraying rules.** An hour is suitable when wind is 1–4 m/s, temperature is 10–25 °C and there is no precipitation (≥ 0.1 mm) within 3 hours before and after. A window is a run of consecutive suitable hours; the best window is the longest one (earliest on a tie). Past hours are never offered, and relative days (`today`, `tomorrow`) are resolved in the city's time zone.

**RAG.** `apps/api/data/docs/*.md` is a curated corpus on spraying practice, each document with a `Source:` line. `pnpm index` writes it into the pgvector table `doc_chunks`: it chunks each document by section, embeds the new or changed chunks with `google/gemini-embedding-001` at 1536 dimensions, and skips the rest by content hash, so re-running it is safe. Deploys do not run it. `searchDocs` returns the top 3 passages above a calibrated similarity threshold (0.64); the agent answers only from them and cites the source. The same tool reads from pgvector.

**Guardrails.** Request validation and size limits, proxy secret, per-client and global rate limits, a prompt-injection input screen, history sanitisation, step and output-token limits, a 30 s agent timeout, label-and-regulations reminder when an answer mentions application rates, safe markdown rendering, and RFC 9457 problem details for every HTTP error.

## Engineering highlights

- **Evals, not eyeballing.** Six eval suites (agent tool selection, spray-check, tools, RAG, guardrails, HTTP guardrails) run against fixed weather fixtures, so the right answer is known. Deterministic and mock-model evals run on every PR with committed baselines; real-model runs go through a manual GitHub Actions workflow (one at a time, results in the job summary) and feed a [model comparison](model-comparison.md) with pass rate, cost per case and latency.
- **Langfuse.** Traces and scores for every model call, plus a dataset of spray-check cases and experiment runs that can be compared side by side per model and prompt version.
- **Offline CI.** CI runs with `CI_OFFLINE=1` and the scripted mock model: any unstubbed network call fails, and no model tokens are spent.
- **One contract.** zod schemas in `@agri/shared` drive validation, the UI types and the OpenAPI document. CI regenerates `apps/api/openapi.json` and fails if it is stale; a type test fails `typecheck` if the agent's message type drifts from the shared one.
- **Proxy auth and client IP trust.** Browser routes require `x-proxy-auth`; `proxy.ts` strips client-sent copies before setting its own. `x-client-ip` is trusted only alongside a valid secret, and `TRUSTED_PROXY_HOPS` tells Express how many proxies sit in front.
- **Streaming verified end to end.** A smoke test measures chunk arrival through Caddy so that buffering is caught; `infra/check-production.sh --stream` checks a real streamed answer through Vercel and Caddy.
- **Safe deploys.** Every green CI run on `main` builds an image to GHCR and runs `deploy.sh`: pre-deploy `pg_dump` snapshot, migrations in a one-off container (a failed migration leaves the running API untouched), readiness check, and automatic rollback to the previous tag on failure.
- **The production stack is tested in CI.** The smoke job brings up Caddy, the API and Postgres from the production Compose file, rehearses deploy, failed migration, failed readiness and rollback, bootstraps a clean Ubuntu 24.04 server, and runs shellcheck and actionlint.
- **Database checks.** Migrations must match the schema (`db:verify`), apply twice idempotently, and repository tests run against real Postgres with pgvector in CI.
- **Supply chain and secrets.** Dependabot for GitHub Actions, third-party actions in the deploy workflow pinned to commit SHAs, gitleaks secret scanning on every PR, least-privilege workflow permissions, and a `production` environment restricted to `main`.
- **Enforced architecture.** ESLint boundary rules per workspace (web never imports backend code, modules talk only through public `index.ts` files), ports and adapters for weather, RAG, cache and rate limits, pino JSON logs with request ids and redaction.

## Configuration

Minimal local API values: `AI_MOCK=1` (scripted mock model, no tokens), the two Open-Meteo URLs (`https://geocoding-api.open-meteo.com/v1/search`, `https://api.open-meteo.com/v1/forecast`) and `DATABASE_URL`. `PROXY_AUTH_SECRET` (≥ 32 chars) is optional outside production. Every key is listed in the `.env.example` files, and a test checks they stay complete.

```bash
docker compose up --build                 # API in production mode on :4000 plus Postgres (needs PROXY_AUTH_SECRET and TRUSTED_PROXY_HOPS)
```

All commands run from the repo root; one workspace only: `pnpm --filter @agri/api <script>`.

| Variable (`apps/api`) | Purpose |
|---|---|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key for the real model |
| `AI_MOCK` | `1` = scripted mock model, `0` = real model |
| `OPEN_METEO_GEOCODING_URL`, `OPEN_METEO_FORECAST_URL` | Open-Meteo endpoints (https only) |
| `DATABASE_URL` | Postgres connection string (required) |
| `PROXY_AUTH_SECRET`, `TRUSTED_PROXY_HOPS` | Proxy secret and proxy count (`0` locally, `1` behind Caddy); required in production |
| `RATE_LIMIT_PER_MINUTE`, `GLOBAL_RATE_LIMIT_PER_MINUTE` | Per-client and global request limits |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`, `LANGFUSE_ENVIRONMENT` | Tracing; disabled when keys are empty |
| `PORT`, `LOG_LEVEL`, `SWAGGER_ENABLED`, `CACHE_DRIVER`, `REDIS_URL` | Port (4000), pino level, Swagger in production, cache driver (`memory`; `redis` reserved) |

The web app needs `API_ORIGIN` (API base URL for the `/api/*` rewrites, read at build time) and the same `PROXY_AUTH_SECRET`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` | Development servers (starts the database first) / production build |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | ESLint with boundary rules / `tsc --noEmit` / unit and component tests |
| `pnpm eval` | Deterministic and mock-model evals (free) |
| `pnpm eval:real` | Real-model evals (costs tokens; `EVAL_MODEL=<id>`, `EVAL_RUNS=1` for a quick run) |
| `pnpm eval:baseline` / `pnpm eval:summary` | Promote the latest results to the baseline / Markdown summary of the latest run |
| `pnpm eval:compare` | Writes [docs/model-comparison.md](model-comparison.md) from the latest real run per model |
| `pnpm langfuse:dataset` / `pnpm langfuse:experiment --model <id>` | Upsert the spray-check dataset / run an experiment on it |
| `pnpm openapi` | Regenerate `apps/api/openapi.json` (commit it with API changes) |
| `pnpm index` | Ingest `apps/api/data/docs/` into `doc_chunks` (changed chunks only; removes documents that are gone) |
| `pnpm index -- --check` | Show what the ingest would add, keep and remove, without writing or embedding |
| `pnpm db:up`, `pnpm --filter @agri/api db:migrate \| db:seed \| test:db` | Database: start, migrate, seed, Postgres tests |

## API

Contract: Swagger at `/docs`, JSON at `/openapi.json`, committed as `apps/api/openapi.json`. The browser calls the API as `/api/*` through the web app; direct calls to browser routes need `x-proxy-auth` when `PROXY_AUTH_SECRET` is set.

**`POST /chat`** — body `{ messages: UIMessage[] }` as sent by `useChat`; response is an AI SDK UI message stream (SSE). A prompt-injection attempt gets a refusal stream (200).

**`POST /spray-check`**

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

Errors are RFC 9457 problem details (`application/problem+json`) with a stable `code` and the request id as `instance`:

| Status | `code` |
|---|---|
| 400 | `invalid_request` (body must be `{ "question": string }`, 1–500 chars) |
| 403 | `forbidden` (missing or wrong `x-proxy-auth`) |
| 413 | `payload_too_large` |
| 422 | `spray_window_not_called` (not a spraying question), `blocked_input` (prompt-injection screen) |
| 429 | `rate_limited` (with `Retry-After`) |
| 502 | `invalid_model_output` (no valid answer and no rule result to fall back to) |
| 503 / 504 / 500 | `model_busy` / `model_timeout` / `internal_error` |

**`GET /health/live`** reports liveness; **`GET /health/ready`** checks the database and answers 503 (`database: "down"`) when it is unreachable.
