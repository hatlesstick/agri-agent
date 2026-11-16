# apps/api — backend rules

NestJS 12 (native ESM, Node 22), Express adapter, Vercel AI SDK 7 (the single model layer), LangChain.js RAG building blocks (from 2.4), LangGraph.js subagent orchestration (Step 3), zod, pino. Runs in Docker on a VPS. Owns **all** backend logic: HTTP API, the agent and its tools, weather, RAG, spray rules, and later identity, database, approvals, Telegram, jobs and MCP. Architecture rationale: `docs/architecture.md`; monorepo rules: root `CLAUDE.md`.

## Module layout
```
src/
  main.ts                 bootstrap: telemetry → env → createApp() → listen → shutdown hooks
  create-app.ts           builds the Nest app (used by main and tests)
  AppModule.ts
  config/                 ConfigModule: zod env schema, API_ENV token; app does not start on invalid env
  common/
    http/                 ProxyAuthGuard, RateLimitGuard (+ @RateLimited), ProblemDetailsFilter, request id, abort-on-close
    cache/                CacheStore port + InMemoryCacheStore (RedisCacheStore later)
    validation/           zod contract → request validation + OpenAPI glue
  observability/          JSON logger with request id, Langfuse telemetry + TelemetryFlushInterceptor, health (live/ready)
  modules/
    agent/                ToolLoopAgent factories, instructions, model, tool registry, model guardrails, mock model, spray-check run + reconcile; graphs/ (Step 3): LangGraph subagent graphs
    weather/              WeatherPort adapter: OpenMeteoClient + forecast cache (CacheStore)
    rag/                  RagEngine port, JsonRagEngine (until 2.4) → LangChain adapter (2.4: textsplitters + PGVectorStore / MemoryVectorStore + AiSdkEmbeddings), searchDocs (sort + threshold + top-k), DocsRepository
    spray-rules/          assessSprayDay (pure)
    chat/                 POST /chat (UI message stream)
    spray-check/          POST /spray-check
    (later) database/ identity/ fields/ actions/ telegram/ jobs/ mcp/
data/                     RAG corpus (docs/*.md) + index.json (until 2.4)
scripts/                  build-index, eval summary/compare/baseline, langfuse-* (tsx; must not import vitest)
tests/                    unit/ e2e/ evals/ support/ fixtures/
openapi.json              generated contract, committed; CI fails when stale
Dockerfile
```
- A module folder holds `<Name>Module.ts`, PascalCase class files (`ChatController.ts`, `ChatService.ts`, `JsonRagEngine.ts`), `<name>.tokens.ts`, `<name>.types.ts` and **`index.ts` — its public API** (module class, exported service types, tokens, port types).
- Another module is imported only through `@/modules/<name>`; never deep imports into another module.

## Layers
- **Controller:** HTTP only — route, guards, validation against the shared zod contract, status codes, OpenAPI metadata. Calls one service method. Never imports repositories or adapters.
- **Service:** business logic and orchestration; owns transaction boundaries (from 2.1); uses repositories, ports and other modules' exported services.
- **Repository (from 2.1):** data access only; every method for user data takes `userId`; accepts an optional transaction.
- **Ports and adapters:** every external dependency (weather API, RAG storage, cache, rate-limit store, model gateway, Telegram, job queue) is a `type` port with an adapter class provided under a DI token. Business code and tools depend on the port, never on the adapter class.
- **Pure rules** (spray thresholds, spray-check reconciliation) are plain functions without DI.

## Dependency injection
- Every constructor parameter has an explicit token: `@Inject(WEATHER_PORT) private readonly weather: WeatherPort`, `@Inject(ChatService) private readonly chat: ChatService`. Do not rely on `emitDecoratorMetadata` (Vitest/tsx compile with oxc/esbuild).
- No module-level singletons and no `new Adapter()` in business code; Nest owns lifetimes. Process-wide state (caches, limiters, RAG index) lives in providers.
- No `forwardRef`; a cycle means a module boundary is wrong.
- Tokens are `Symbol`s exported from `<name>.tokens.ts` and re-exported from the module's `index.ts`.

## Contracts, validation, Swagger
- Request/response/error schemas are zod schemas in `@agri/shared` (`packages/shared/src/contracts/`). Do not hand-write duplicate DTO classes.
- Controllers validate body/query/params against the contract; invalid input → problem details `invalid_request` (400).
- OpenAPI is generated from the same schemas; Swagger UI at `/docs`, JSON at `/openapi.json` outside production (production only with `SWAGGER_ENABLED=1`). `pnpm --filter @agri/api openapi` regenerates `openapi.json`; commit it with the change.
- Streaming endpoints document `text/event-stream` (AI SDK UI message stream).
- Tool input/output schemas live in `@agri/shared` (`contracts/tools`); tools use them as `inputSchema` / `outputSchema`. A type test asserts the agent's inferred UI message type is assignable to `AgriChatMessage` from shared.

## Errors
- Every HTTP error is RFC 9457 `application/problem+json`: `{ type, title, status, detail?, instance, code }`. `code` comes from `contracts/errors.ts` (`invalid_request`, `payload_too_large`, `part_too_large`, `message_too_long`, `conversation_too_long`, `rate_limited`, `forbidden`, `not_found`, `blocked_input`, `spray_window_not_called`, `invalid_model_output`, `model_busy`, `model_timeout`, `internal_error`); `instance` is the request id.
- One global `ProblemDetailsFilter` maps `HttpException`s, validation errors, body-parser errors (413/400) and unknown errors (500, no internals leaked). 429 carries `Retry-After`.
- Chat input blocked by the input screen is not an HTTP error: it returns 200 with a refusal stream.
- Inside tools, external failures stay data (`{ error: "weather_unavailable" }`) so the model can explain them.

## Configuration
- One zod env schema in `config/`; read through the `API_ENV` token, never `process.env` in business code. Production requires `PROXY_AUTH_SECRET` (≥ 32 chars) and `TRUSTED_PROXY_HOPS`.
- `TRUSTED_PROXY_HOPS` = proxies in front of the API (Caddy = 1, local = 0) → Express `trust proxy`. `X-Client-IP` is trusted only with a valid `X-Proxy-Auth`.
- `.env.example` lists every key read in code (checked by a test); local env in `apps/api/.env`.

## Caching and state
- `CacheStore` port (`get`, `set` with TTL, `delete`); adapter `InMemoryCacheStore` (bounded LRU) now, `RedisCacheStore` later via `CACHE_DRIVER=memory|redis` + `REDIS_URL`. The weather forecast cache uses it.
- `RateLimitStore` port for request limits (in-memory now; Redis/Postgres when there is more than one API instance).
- New caches or counters go through these ports — never a module-level `Map`.

## Observability and operations
- Logging: **pino** via `nestjs-pino` (`LoggerModule.forRootAsync` reading `API_ENV`): JSON lines with request id (`x-request-id`, generated if missing), `LOG_LEVEL`, `pino-pretty` transport only when `NODE_ENV=development`, `redact` for `req.headers.authorization`, `req.headers.cookie`, `req.headers["x-proxy-auth"]` and bodies. Inject `PinoLogger` / use Nest `Logger` (backed by pino); never `console.*` in `src/`. Never log prompts, secrets or personal data.
- Langfuse via AI SDK telemetry (`registerAgentTelemetry()` at bootstrap, before the app); `TelemetryFlushInterceptor` flushes after each request. Every model call sets `telemetry.functionId` (`chat`, `spray-check`, `eval:<case>`). Tools get the current time through AI SDK tool context; never fake the global `Date`.
- `GET /health/live` (process) and `GET /health/ready` (config; DB from 2.1; Redis when enabled).
- `enableShutdownHooks()`; stop accepting, finish in-flight requests, close clients.
- Timeouts: agent 30 s (`AGENT_TIMEOUT_MS`), Open-Meteo 8 s; client disconnect aborts the agent run.

## Security
- `ProxyAuthGuard` on browser routes; rate limits per client + global; JSON body cap 256 KiB (`CHAT_LIMITS.maxBodyBytes`); CORS closed for browsers; security headers; non-root container.

## Agent domain (moved from the root rules)
### Tools
- **`getWeather`** `{ city }` — English name, Latin script, base form (`Lyon`, `Kraków`); schema rejects other scripts, instructions tell the model to translate. Geocoding → 3-day forecast → compact result (city, coordinates, `timezone`, hourly temperature, wind, precipitation, precipitation probability, humidity; 48 local hours). Errors as data: `city_not_found`, `weather_unavailable`.
- **`sprayWindow`** `{ city, date }` (`YYYY-MM-DD` city-local, or relative day) → `{ canSpray, bestWindow, windows, rejectedReasons }` from `assessSprayDay`. Rules (parameters with defaults): wind 1–4 m/s; no precipitation 3 h before and after (Open-Meteo precipitation at hour T is the preceding hour's sum, so values i-2..i+4 are checked); past hours never offered; 10–25 °C; humidity ≥ 50 % optional. Rejects past dates and dates outside the forecast. The result is final — the model reports it.
- **`sprayOutlook`** `{ city }` — every remaining forecast day (up to 3) in one call, for "when / which day" questions; not available to the spray-check agent (`activeTools`).
- **`searchDocs`** `{ query }` (short English) — top-3 passages with `source` above the threshold (`REAL_MIN_SCORE` 0.64, calibrated 2026-11-11: on-corpus top 0.725–0.868, off-corpus 0.477–0.551; recalibrate after corpus changes; mock mode uses a bag-of-words index and `MOCK_MIN_SCORE` 0.15). The agent answers practice questions only from passages, cites sources, and says it has no reliable information when there are no hits.

### Guardrails (defence in depth)
Input screen (fixed refusal without a model call) → history sanitising (client tool data stripped, last 12 messages, ≤ 20 messages, ≤ 2,000 chars per message, ≤ 8,000 total) → validated external strings → instructions that treat tool results as data → read-only tools → code-owned decisions and spray-check reconciliation (model value overwritten by the `sprayWindow` result; error if `sprayWindow` was not called) → output middleware appending a label/regulation reminder when application rates appear → `tool_code` leak middleware. Model limits: `maxOutputTokens` 800, `isStepCount(5)`, 30 s.

### Models and AI SDK
- **AI stack:**
  - **Vercel AI SDK is the only way to call models and embeddings** (agent, tools, structured output, streaming, `embed`/`embedMany`, AI Gateway, mock model, guardrail middleware, Langfuse telemetry).
  - **LangGraph.js** (Step 3) orchestrates subagents in `modules/agent/graphs`: state, routing, `interrupt` for human approval, Postgres checkpointer. Graph nodes call models through the AI SDK (`generateText` / `ToolLoopAgent`), never LangChain chat models. Stream to the UI with `@ai-sdk/langchain`.
  - **LangChain.js** (2.4) only for RAG building blocks in `modules/rag`: `@langchain/textsplitters`, `PGVectorStore` / `MemoryVectorStore`, retriever wrapped as the `RagEngine` adapter, embeddings via `AiSdkEmbeddings` (LangChain `Embeddings` backed by AI SDK `embedMany`).
  - Import `langchain`, `@langchain/*` only in `modules/rag` and `modules/agent/graphs`. Upgrade `ai` together with `@ai-sdk/langchain` (it pins an exact `ai` version).
- Models via Vercel AI Gateway (`AI_GATEWAY_API_KEY`, `"provider/model"` strings). Default `google/gemini-2.5-flash-lite`, fallback `openai/gpt-5.4-nano`; comparison candidates `deepseek/deepseek-v4-flash`, `amazon/nova-lite`, `amazon/nova-2-lite` (paid credits). `anthropic/claude-haiku-5.5` not on the Free Tier. Model name constants in `modules/agent/model.ts`; prices with their read date in `tests/evals/model-pricing.ts`.
- Embeddings `google/gemini-embedding-001`.
- Tool input schemas stay portable: no `\p{…}` regex escapes (OpenAI rejects them).
- Verified APIs (ai@7.0.170 — re-check on upgrade): `ToolLoopAgent`; `isStepCount(n)`; `tool({ description, inputSchema, outputSchema, contextSchema, execute })`; `generateText({ output: Output.object({ schema }) })`; `convertToModelMessages`; `pipeAgentUIStreamToResponse({ response, agent, uiMessages, options, abortSignal, timeout })` for Node responses; `embed`, `embedMany`, `cosineSimilarity`. Deprecated: `toUIMessageStreamResponse`, `generateObject`, `stepCountIs`.

### Time
Open-Meteo with `timeformat=unixtime`; hours labelled with `Intl` in the city's time zone (DST-safe). All times are city-local ISO without offset (`2026-11-12T08:00`); tool results include `timezone`; relative days resolved by tools, not the model; no UTC in model answers.

### Open-Meteo
Geocoding `$OPEN_METEO_GEOCODING_URL?name=<city>&count=1&language=en`; forecast `$OPEN_METEO_FORECAST_URL` with hourly temperature_2m, precipitation, precipitation_probability, wind_speed_10m, relative_humidity_2m, `wind_speed_unit=ms`, `timezone=auto`, `forecast_days=3` (tomorrow's "3 h after" rule needs the next day). URLs from env, https only.

## Testing
- **Unit** (`tests/unit/**`): services, pure rules, adapters with stubbed HTTP, guards, filter, pipes; ports replaced by fakes from `tests/support`.
- **E2E** (`tests/e2e/**`): every controller through `createApp()` + supertest with fake ports and the mock model; success, validation errors, problem-details shape, guards.
- **Evals** (`tests/evals/*.eval.ts`, `pnpm eval`): mock model in CI; results in `.evals/results`, baselines in `tests/evals/baselines/`; real model (`pnpm eval:real`) only when asked. Weather in evals comes from fixtures through the real Open-Meteo client.
- **Contract:** generated `openapi.json` equals the committed one.
- Test files must be covered by a tsconfig with `experimentalDecorators` (oxc fails on decorators otherwise); the build uses `tsconfig.build.json` (`rootDir: src`).

## Where new code goes
- New endpoint → controller + service in `modules/<feature>/`, contract schemas in `@agri/shared/contracts`, e2e test, regenerated `openapi.json`.
- New external dependency → port type + adapter class + token in the owning module; tests with a fake.
- New business rule → pure function in the owning module (`modules/spray-rules/` for spraying).
- New agent capability → tool in `modules/agent/tools/<name>/` taking ports, schemas in `@agri/shared/contracts/tools`, one line in the tool registry, eval cases.
- New multi-step / multi-agent flow → a LangGraph graph in `modules/agent/graphs/<name>/` whose nodes use AI SDK calls and existing tools/services; checkpoints in Postgres; eval cases per path.
- New retrieval capability → inside `modules/rag` behind `RagEngine` (LangChain building blocks allowed there).
- New channel (Telegram, MCP) → its own module calling `modules/agent` services through DI.

## Lint-enforced boundaries
- `common/`, `config/`, `observability/` never import `modules/`.
- Modules import other modules only via `@/modules/<name>`.
- Controllers never import repositories or adapters; tools and services import ports/tokens, never adapter classes.
- No `next`, `react`, `react-dom` anywhere in `apps/api`.
- `langchain`, `@langchain/*` only in `modules/rag/**` and `modules/agent/graphs/**`; no LangChain chat-model classes anywhere (`@langchain/openai`, `@langchain/anthropic`, `@langchain/google-*`).

## Containers
- `Dockerfile`: multi-stage, `pnpm deploy --prod`, Node 22 slim, non-root, `HEALTHCHECK` on `/health/live`, `data/` included.
- Root `docker-compose.yml`: `api` + `db` (pgvector, from 2.1) + `redis` (profile `cache`); `docker-compose.prod.yml` adds `caddy` (2.2). `db`/`redis` ports bound to `127.0.0.1`.

## Commands
- `pnpm --filter @agri/api dev | build | start | test | eval | openapi`
- From the root: `pnpm eval:real [files]`, `pnpm eval:summary`, `pnpm eval:compare`, `pnpm eval:baseline <runId>`, `pnpm langfuse:dataset`, `pnpm langfuse:experiment --model <id>` (`AI_MOCK=1 … --dry-run` locally), `pnpm index` — real-model runs and Langfuse writes only when the developer asks.
- `docker compose up` (API), `docker compose --profile cache up` (with Redis).
