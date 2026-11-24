# agri-agent — architecture and rules

This document is the source of truth for how the system is split and how code is written. `CLAUDE.md` files summarise it per workspace: the root file for the monorepo, `apps/api/CLAUDE.md` for the backend, `apps/web/CLAUDE.md` for the frontend.

## Intent

- **Two deployables, one contract.** `apps/web` is a Next.js UI on Vercel. `apps/api` is a NestJS backend in Docker on a VPS. They talk only over HTTP (`/api/*` proxied by Vercel to the API). All business logic lives in the backend: the agent, tools, weather, RAG, spray rules, and later identity, fields, approvals, Telegram, jobs and MCP.
- **Maintainable:** one place per concern, small modules with explicit public APIs, contracts written once, rules enforced by lint and tests rather than memory.
- **Scalable:** the API is stateless between requests; everything stateful (cache, rate limits, data, jobs) sits behind a port with an adapter that can move from in-process to Postgres / Redis / Inngest without touching business code. Modules can be extracted into services later because they only talk through their public APIs.

## Decisions that change earlier plans

- **`packages/agent` is dissolved into `apps/api/src/modules/*`** (developer's decision: all backend logic lives in the backend). This replaces decisions 3–4 of `docs/plan-step-2.md` (framework-free `@agri/agent` imported by web, workers and eve). Telegram, Inngest functions and MCP are Nest modules of the same API process, so they still reach the agent through DI; the Step 4 eve agent reaches it over the MCP server. Agent code becomes DI providers (no module-level singletons; the weather cache moves to `CacheStore`). Evals, baselines, `eval-real.yml`, `pnpm index` and `langfuse:*` scripts move to `apps/api`.
- **This document supersedes `docs/plan-step-2.0b.md`.** Stage 2.0b is re-planned to reach this architecture directly, including the browser contract change (problem details) and the matching web error mapping in the same PR. The spike result stands: Nest 12 as native ESM (`"type": "module"`, `nodenext`, `tsc`), explicit DI tokens, `pipeAgentUIStreamToResponse`, Next `proxy.ts` headers + `rewrites` with unbuffered streaming.
- **Chat input blocked by the input screen stays a 200 refusal stream** (it is a model-level guardrail answered in the chat), not a problem response. HTTP-level failures (validation, size, rate limit, proxy auth, agent failures) are problem responses.
- **Tool and chat types are owned by `packages/shared`.** Tool input/output zod schemas move to `packages/shared/src/contracts/tools/`; backend tools import them for `inputSchema` / `outputSchema`; `AgriChatMessage` (the UI message type) is declared in shared from those schemas with `import type { UIMessage } from "ai"`. A backend type test asserts that the agent's inferred UI message type is assignable to `AgriChatMessage`, so drift fails `typecheck`. In OpenAPI the chat request is described as `{ messages: ChatMessage[] }` with `role` and `parts` (parts as a loosely typed array of objects with `type`), since the full UI message union is a client-library protocol, not our contract.
- **Scope per stage:** each stage implements only what it needs and leaves the seams named here (`database/`, readiness check for DB/Redis, Compose `db`/`redis`/`caddy`). Items marked "from 2.1" / "2.2" are built in those stages.

## AI stack

- **Vercel AI SDK is the single model layer.** Every model and embedding call in the backend goes through it: `ToolLoopAgent`, `generateText` / `Output.object`, tools, `embed` / `embedMany`, AI Gateway, the scripted mock model, guardrail middleware and Langfuse telemetry. Streaming to the UI uses the AI SDK UI message stream (`@ai-sdk/react` on the web side). Model ids and limits come from one place (`modules/agent/core/model.ts`; the embedding model id in `modules/rag/embeddings/embedding-model.ts`).
- **LangGraph.js orchestrates subagents** (Step 3): a graph in `modules/agent/workflows` holds state, routing between subagents, human-in-the-loop `interrupt` and a Postgres checkpointer (`@langchain/langgraph-checkpoint-postgres`). **Nodes call models only through the AI SDK** (`generateText` / `ToolLoopAgent` inside a node); no LangChain chat models. Graph runs stream to the UI through `@ai-sdk/langchain`, so the web client keeps `useChat`.
- **LangChain.js provides RAG building blocks** (Stage 2.4): `@langchain/textsplitters` for chunking, `PGVectorStore` (`@langchain/community`) on pgvector in production and `MemoryVectorStore` in mock mode / offline CI, a retriever wrapped as the `RagEngine` adapter. Embeddings are an `AiSdkEmbeddings` class (LangChain `Embeddings` implemented with AI SDK `embedMany`), so AI Gateway, mock embeddings and telemetry stay in the single model layer. Threshold, top-k and the `searchDocs` tool contract stay ours.
- **Containment:** LangChain / LangGraph packages are imported only in `modules/rag` (adapters) and `modules/agent/workflows`; tools, controllers and other modules see only our ports and services. `@ai-sdk/langchain` pins an exact `ai` version — upgrade `ai` together with it so only one copy is installed.
- Why these libraries: LangChain.js and LangGraph.js are the most used JS options for RAG and agent graphs (npm, Nov 2026: `@langchain/core` ~8.5 M/week, `langchain` ~4 M, `@langchain/langgraph` ~5 M, vs `llamaindex` ~0.2 M), with an official AI SDK bridge and Langfuse integration.

## Non-goals

- No microservices now: one API process (modular monolith).
- No full DDD / hexagonal folders (`domain/application/infrastructure`, use-case classes). Layers are controller → service → repository, with ports at the edges.
- No backend code in `apps/web` (no route handlers, no server actions with business logic, no agent imports).

## Workspaces

```
apps/web          Next.js UI (Vercel). UI only; talks to the API through /api/* rewrites + proxy.ts headers.
apps/api          NestJS API (Docker, VPS). All backend logic; Swagger/OpenAPI for its contracts.
packages/shared   Contracts only: zod schemas + types for requests, responses, errors, chat UI message and tool input/output; shared limits; pure helpers both sides need; test-support helpers (./testing).
```

There is no `packages/agent`: the agent is part of `apps/api`.

`packages/shared` has no framework and no runtime AI SDK import (type-only `import type` from `ai` is allowed for the chat UI message type). Nothing in `packages/shared` performs I/O.

## Backend (`apps/api`)

### Module layout

See `apps/api/CLAUDE.md` → "Module layout" for the full tree; in short: `bootstrap/`, `config/`, `common/{errors,http,rate-limit,cache,clock,openapi}`, `observability/{logging,telemetry,health}`, `modules/<feature>/` with role subfolders (`core/`, `domain/`, `adapters/`, `tools/`, `guardrails/`, `workflows/`, `validation/`, `streams/`, `embeddings/`, `errors/`, `mock/`).

A module's root contains only `<Name>Module.ts`, its controllers and services (PascalCase class files), `<name>.tokens.ts` for DI tokens, one `<name>.types.ts` (ports included) and `index.ts` — the module's **public API**; everything else sits in a role subfolder (the module class, its exported services' types, tokens). Other modules import a module only through `@/modules/<name>` (its `index.ts`).

### Layers inside a module

- **Controller:** HTTP only — route, guards, validation of the request against the shared zod contract, status codes, Swagger metadata. Calls one service method. No business rules, no repositories.
- **Service:** business logic and orchestration; opens transactions (from 2.5, via a repository `tx` parameter or unit-of-work helper); calls repositories, ports and other modules' exported services.
- **Repository:** data access only (Drizzle, `@Inject(DATABASE)`), in the owning module's `repositories/`; every method for user data takes `userId` and filters by it. Tables are declared centrally in `src/database/schema/`; only repositories import them.
- **Ports and adapters:** anything external (weather API, RAG storage, cache, model gateway, Telegram, job queue) is a `type` port with an adapter class provided under a DI token. Business code depends on the token, never on the adapter class.
- **Pure rules** (spray thresholds, reconciliation) are plain functions without DI.

### Dependency injection

- Every constructor dependency uses an explicit token: `@Inject(WEATHER_PORT) private readonly weather: WeatherPort`. Classes may be their own token (`@Inject(ChatService)`). No reliance on `emitDecoratorMetadata` (Vitest and tsx compile with esbuild/oxc, which do not emit it).
- No module-level singletons in `apps/api`: Nest owns lifetimes. Process-wide state (caches, limiters) lives in providers.
- No `forwardRef`; a cycle means a module boundary is wrong.

### Contracts and Swagger

- Request / response / error schemas are zod schemas in `packages/shared/src/contracts/`. They are the single source of truth for the web client and the API.
- The API validates every request body / query / params against the contract at the controller boundary and documents it in OpenAPI from the same schema (no hand-written duplicate DTO classes).
- Swagger UI at `/docs` and JSON at `/openapi.json` outside production (production: disabled unless `SWAGGER_ENABLED=1`).
- `apps/api/openapi.json` is generated by a script and committed; CI fails when it is out of date, so contract changes are visible in review.
- Streaming endpoints document `text/event-stream` with the UI message stream protocol named in the description.

### Errors

- All errors are RFC 9457 problem details (`application/problem+json`): `{ type, title, status, detail?, instance, code }`. `code` is the stable machine code (`invalid_request`, `payload_too_large`, `rate_limited`, `forbidden`, `blocked_input`, `model_busy`, …) listed in `packages/shared/src/contracts/errors.ts`; `instance` is the request id.
- One global `ProblemDetailsFilter` maps `HttpException`s, validation failures, body-parser errors and unknown errors (500, no internals leaked). `Retry-After` on 429.
- External-service failures inside tools stay data (`{ error: "city_not_found" }`) so the model can explain them; HTTP mapping happens only in controllers / the filter.

### Configuration

- Env is parsed once at startup by a zod schema in `config/`; the app does not start on invalid env. Modules receive config through the `API_ENV` token; `AI_MOCK` is the one process-wide switch read directly (`isMockMode()`).
- Each app has `.env.example`; a test checks it lists every key read in code and holds no secret values.

### Caching and state (scalability)

- `CacheStore` port: `get<T>(key)`, `set<T>(key, value, ttlMs)`, `delete(key)`, `clear()` (an adapter clears only its own key prefix). Adapter now: `InMemoryCacheStore` (LRU with max entries). Later: `RedisCacheStore` selected by `CACHE_DRIVER=memory|redis` + `REDIS_URL`.
- Weather forecast cache uses `CacheStore`. Rate limiting uses the `RateLimiter` type as its store port (`RATE_LIMITERS`) (in-memory now; Redis/Postgres when there is more than one API instance).
- Rule: a new cache or counter is added through these ports, never as a module-level `Map`.

### Observability and operations

- Structured JSON logs with **pino** through `nestjs-pino` (`pino-http` request logging): request id from `x-request-id` (generated if absent) on every line, level from `LOG_LEVEL`, `pino-pretty` only in local development, redaction of `authorization`, `cookie`, `x-proxy-auth` and request bodies; Nest's logger is replaced by the pino logger (`bufferLogs` + `app.useLogger`). No prompt or personal data in logs; trace ids join logs when OpenTelemetry tracing is added.
- Langfuse traces for every model call (`userId`, `sessionId`, channel tags from 2.3+); flushed after each request by an interceptor.
- Health: `GET /health/live` (process up) and `GET /health/ready` (config loaded; DB from 2.1; cache backend when Redis is used).
- Graceful shutdown: `enableShutdownHooks()`, stop accepting connections, finish in-flight requests, close DB / cache clients.
- Request timeouts: agent calls 30 s; outbound HTTP 8 s; client disconnect aborts the agent run.

### Security

- `ProxyAuthGuard` on browser routes (`X-Proxy-Auth` from Vercel `proxy.ts`), `X-Client-IP` trusted only with a valid secret; Telegram / Inngest / MCP routes use their own auth.
- Rate limits per client and global; JSON body cap 256 KiB; CORS closed for browsers; baseline security headers (nosniff, frame deny, no-referrer, CORP same-site); secrets only from env; non-root container.

### Identity and sessions

- Every browser visitor is an anonymous `web` user (`identities` row with a random `external_id`) behind a server-side session. The session token is 32 random bytes in cookie `__Host-agri_session` (`HttpOnly; Secure; SameSite=Lax; Path=/`, no `Domain`, 400 days); the `sessions` table stores only `sha256(token)`.
- `SessionGuard` runs after `ProxyAuthGuard` and `RateLimitGuard`, so forbidden or rate-limited requests never create users or sessions. It resolves `userId` (`@CurrentUserId()`), slides the session at most once per 24 h, and sets the cookie on the first visit or after a slide. An unknown, tampered or expired token is treated as no session: a fresh user, never another user's id and never a 4xx.
- Repositories outside `modules/identity` take `userId` first; `tests/unit/architecture` enforces this by scanning source.
- Revocation is deleting the session row (sign-out, 2.3b) or the user (`/forget`, 2.5); both are cascades, so a stale cookie gets a new user.

### Testing

- **Unit:** services, pure rules, adapters (with stubbed HTTP), guards, filter; ports replaced by fakes.
- **E2E:** every controller through `createApp()` + supertest with fake ports and the mock model; covers success, validation errors, problem-details shape, guards.
- **Evals:** agent behaviour with the mock model in CI, real model only on request.
- **Contract:** generated `openapi.json` matches the committed one.
- Offline in CI (`CI_OFFLINE=1`); real DB tests from 2.1 per the test-DB decision.

### Lint-enforced boundaries (ESLint `no-restricted-imports`)

- `common/`, `config/`, `observability/` never import `modules/`.
- A module imports another module only via `@/modules/<name>`; no deep imports into another module.
- Adapter classes are imported only inside their own module and by `createAgentPorts()`; controllers, services and tools depend on ports/tokens.
- No relative imports and no `console.*` in `apps/api/src`.
- `apps/api` never imports Next.js or React; `apps/web` never imports `apps/api` or runtime AI agent code.

## Frontend (`apps/web`)

- UI only: `app/` routes (pages), `ui/` atomic design, hooks for logic, `react-hook-form` + zod for forms.
- Types for chat messages and tool parts come from `packages/shared` contracts; error messages are derived from the problem-details `code`.
- `src/proxy.ts` adds `X-Proxy-Auth` / `X-Client-IP` to `/api/*`; `next.config.ts` rewrites `/api/:path*` to `API_ORIGIN`.

## Containers

- `apps/api/Dockerfile`: multi-stage, `pnpm deploy --prod`, Node 22 slim, non-root, `HEALTHCHECK` on `/health/live`.
- `docker-compose.yml` (repo root) services: `api`, `db` (`pgvector/pgvector:pg17`; credentials required from the root `.env`), `redis` (profile `cache`, off by default), ports bound to `127.0.0.1` only, named volumes for data.
- Production (2.2): one VPS (Ubuntu 24.04, bootstrapped by `infra/bootstrap.sh`) running `infra/docker-compose.prod.yml` — `caddy` (automatic HTTPS, the only public entry) → `api` (immutable GHCR image `sha-<7>`) → `db` (no published port). GitHub Actions deploys after green CI on `main` via `infra/deploy.sh`: pre-deploy `pg_dump` snapshot, one-off migration container, switch, readiness check, automatic rollback to the previous tag. Details: `docs/deploy.md`.
- `docker compose up` runs the API with its dependencies locally; the web app runs with `pnpm --filter @agri/web dev` (or on Vercel) and points `API_ORIGIN` at it.
