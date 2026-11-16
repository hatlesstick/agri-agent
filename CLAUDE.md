# CLAUDE.md — agri-agent

Current plan: docs/plan-step-2.md (stage plans: docs/plan-step-2.*.md) — one stage at a time, stop after each.
Architecture and the rules behind it: **docs/architecture.md** (source of truth). Workspace rules: **apps/api/CLAUDE.md** (backend, agent) and **apps/web/CLAUDE.md** (frontend).

## Overview
`agri-agent` is a tool-using AI agent that assesses field-spraying conditions from weather forecasts and answers spraying-practice questions from a small document corpus. It is built on the Vercel AI SDK; the web chat is the first channel, Telegram and MCP follow.

- Streams responses to the client; selects and chains tools autonomously (weather → spray window → answer).
- Determines whether a field can be sprayed, the best time window, and explains the decision.
- Exposes a structured endpoint returning `{ city, canSpray, bestWindow, reason }`.
- Roadmap: weather → spray window → RAG → field memory → photo diagnostics → multi-agent; Step 1 history in `docs/step-1-stages.md`.

## Core principle: code decides, the model explains
- `canSpray` and `bestWindow` are computed by deterministic code; the model picks tools and phrases the reason, never recomputes or overrides a decision. If they disagree, the code wins.
- Large data never flows through the model: it passes short parameters (`city`, `date`), tools fetch data themselves.
- Writes (from Step 2.5): the model proposes, code executes after human approval.

## Monorepo
pnpm + Turborepo. Two deployables and one contract package:
```
apps/web          Next.js UI on Vercel — UI only, talks to the API over HTTP (/api/* rewrites + proxy.ts)
apps/api          NestJS API in Docker on a VPS — all backend logic: agent, tools, weather, RAG, rules, HTTP, later DB/Telegram/jobs/MCP
packages/shared   contracts only: zod request/response/error schemas, chat message + tool types, shared limits, test helpers
```
- `apps/web` never imports backend code; `apps/api` never imports Next.js or React; `packages/shared` performs no I/O and imports no framework (type-only `ai` import allowed for the chat message type).
- Cross-workspace imports only through package names (`@agri/shared`, `@agri/shared/testing`); no deep imports.
- Packages build to `dist` with tsup; Turbo runs `^build` before lint / typecheck / test / eval / dev.

## Working rules
- **One stage at a time.** Stop after each stage for review and merge; one PR per stage; ask before `[ask]` decisions with a recommendation.
- **Don't invent APIs from memory:** verify AI SDK, NestJS, Drizzle, grammY, Inngest, MCP SDK and Next.js APIs against the installed `node_modules` docs/types.
- Minimal dependencies; never add one without explaining why.
- Keys only in `.env.local` / `.env` per app, never in code or commits; each app has a `.env.example` checked by a test.
- **Save tokens:** develop with `AI_MOCK=1` (scripted mock model). Real-model runs and `eval:real` only when the developer asks.
- **Language:** everything in the repo is English (code, tests, prompts, commits, docs, plans). The agent replies in the user's language. Chat with the developer in Ukrainian.
- Mock data uses European cities (default: Lyon, `Europe/Paris`).
- Small conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `build:`, `chore:`); **never add `Co-Authored-By` or any Claude attribution** to commits or PRs.
- After each stage: what changed, how to verify, 2–3 self-check questions.

## Code style (all workspaces)
- **No comments in code** — not when creating files, not when editing. Clarity comes from names and small functions; decisions are explained in chat.
- Classes in PascalCase files named after the class (`WeatherRepository.ts`); React components in PascalCase folders/files; hooks `useX.ts`; everything else kebab-case (`chat-request.ts`, `assess-spray-day.ts`).
- Prefer `type` over `interface`; a class's input/output types in `<ClassName>.types.ts`, a module's shared types in `<name>.types.ts`.
- Errors from external services are data at the adapter/tool boundary (`{ error: "city_not_found" }`); HTTP mapping only at the HTTP edge.

## Testing (all workspaces)
- Tests live in each workspace's `tests/` (`unit/`, `e2e/` in the API, `evals/`, `support/`, `fixtures/`), never next to the code; import code under test via `@/…`, helpers via `@tests/…`.
- Every new service, adapter, guard, helper, hook gets unit tests; every new endpoint gets e2e tests; every new component a component test; every new agent behaviour eval cases. Bug fixes start with a failing test.
- CI is offline (`CI_OFFLINE=1`, `AI_MOCK=1`); tests must not depend on ambient env — stub what they need.

## Commands (repo root)
- `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm eval` (mock, never cached)
- `pnpm eval:real [files]`, `pnpm eval:summary`, `pnpm eval:compare`, `pnpm eval:baseline <runId>`, `pnpm langfuse:dataset`, `pnpm langfuse:experiment --model <id>`, `pnpm index` — backend tooling (see apps/api/CLAUDE.md; real-model / Langfuse writes only when asked)
- One workspace: `pnpm --filter @agri/api <script>` (or `@agri/web`, `@agri/shared`)
- Containers: `docker compose up` (API + its services; see apps/api/CLAUDE.md)
