# Product scope

What agri-agent is, what is built now (the core, Steps 1–5) and what comes after it (the backlog, E1–E7). Detailed requirements for the backlog: [backlog-extensions.md](backlog-extensions.md). Known gaps: [tech-debt.md](tech-debt.md).

## Product
agri-agent is an AI assistant for farmers and agronomists. It answers "can I spray this field, and when?" from the hourly forecast, remembers the user's fields, answers crop-protection questions from cited documents, and works in a web chat and, later, in Telegram, with background alerts.

Principles that apply to every feature:
- **Code decides, the model explains.** Numbers and decisions come from deterministic code; the model chooses tools and explains the result.
- **Human in the loop.** The model proposes changes; code executes them only after a person approves; every change is audited.
- **Sources and confidence.** Every answer shows where its data comes from and how fresh it is; data is scoped per user.
- **Evals first.** Every feature ships with evals that run in CI.

## Core (Steps 1–5)
The core is built first. Backlog items are not started until the core is done, except where noted.

### Step 1 — Agent and quality process (done)
- Agent with weather, spray window, spray outlook and document search tools; structured `POST /spray-check` endpoint; streaming web chat.
- CI on every PR: lint, typecheck, tests, mock evals, build, secret scanning.
- Manual real-model eval workflow and model comparison (quality, cost, latency) → [model-comparison.md](model-comparison.md); Langfuse datasets and experiments.
- Open operational items: rotate keys, run the real-model comparison, two Langfuse experiment runs, own domain.

### Step 2 — Backend, memory, Telegram (in progress, Stage 2.3 next)
- **Platform (done):** pnpm + Turborepo monorepo; NestJS API with all backend logic; Next.js web on Vercel through a rewrite proxy; Postgres + pgvector with Drizzle migrations; production on a VPS (Docker Compose, Caddy HTTPS) with automated deploys, snapshots and rollback.
- **Accounts:** anonymous first-party session now; sign-in later; all data scoped per user.
- **Chat (web):** weather, spray window, spray outlook, crop-protection Q&A with sources.
- **Spray rules quality:** gusts, Delta T and inversion risk in the deterministic rules.
- **Saved fields:** create, update and delete fields (name, crop, location, area) from chat or UI; every write goes through an approval card and the audit log.
- **Field-aware answers:** "can I spray my wheat field tomorrow?" uses the saved field.
- **Knowledge base:** RAG on Postgres + pgvector, hybrid search (vector + full text), answers cite sources.
- **Telegram bot:** the same agent, conversation history, inline approve / reject, rate limits.
- **Background processing (Inngest):** reliable Telegram handling (deduplication, retries), approval expiry.
- **Limits and safety:** per-user rate limit and daily usage budget, guardrails, hard spend limit on the model gateway, off-site backups.
- **Then:** MCP server (tools, resources, prompts; writes only through approval); observability (OpenTelemetry + Langfuse).

### Step 3 — Multi-agent
- A supervisor routes to specialists: weather, crop protection (RAG), reviewer (LangGraph.js, model calls through the AI SDK).
- Approvals with approve / edit / reject; low-confidence answers go to a review queue.
- Conversations survive restarts (Postgres checkpointer); multi-turn and approval evals.

### Step 4 — Background agent
- Morning alerts: "today's spray window on field X is from … to …" in the web app and Telegram, at a time the user sets, with quiet hours.
- Inngest cron with fan-out per user and field: idempotent, retried, with state between runs.
- A second implementation of the same background agent on Vercel eve, connected to the API through the MCP server, compared in the README.

### Step 5 — Production hardening and pilot users
- Full authentication, distributed rate limiting, budgets and alerts; an optional AWS deployment (ECS Fargate, RDS, S3, Bedrock with Guardrails, CDK).
- Pilot farms as real users; 👍 / 👎 feedback → Langfuse → new eval cases.
- Agronomist review queue in an admin view.
- Photo diagnosis (vision) with evals.
- Knowledge graph (field → crop → disease → product → restriction) with a `queryGraph` tool, compared with vector search.

**Core is done when** a farmer can use the web app or Telegram to save fields with approval, get field-aware spray advice with sources, receive morning alerts, and the system runs in production with evals, tracing, limits and user feedback.

## Backlog (after the core)
Planned features, tracked here and not built until the core is done. E1 may ship together with Step 4. Order is the priority.

| Order | # | Feature | What the user gets | Depends on |
|---|---|---|---|---|
| 1 | E2 | Field map and dashboard | Draw or import field boundaries (area, centroid), a map of all fields with today's status, a field card with today + 7 days | Step 2, PostGIS |
| 1 | E3 | Work log and voice | Telegram voice note → structured log entry (field, work, product, dose, date) through approval; pre-harvest interval warnings; CSV / PDF season report | Step 2 approvals, Telegram |
| 2 | E1 | Irrigation and temperature risks | "Irrigate or not, and how many mm" from a water balance (ET0, rain, soil); frost and heat alerts | Step 4 |
| 3 | E4 | Agro models and planner | Growth stage from GDD, disease and pest risk with sources, a weekly work plan per field with approval | Step 3, E1, E3 |
| 4 | E5 | Satellite monitoring | Sentinel-2 NDVI per field, season dynamics, alert when part of a field drops | E2 |
| 5 | E6 | Farm team and mobile | Roles (owner, agronomist, worker, read-only), tasks, review queue; Telegram Mini App; mobile app with push, offline log, photos, GPS boundary walk | Step 5 auth, E3, E4 |
| 6 | E7 | Sensors and integrations | Own weather stations and soil sensors via webhooks, grain prices, exports | E1, MCP |

Cross-cutting agent improvements in the backlog: user memory (equipment, preferred products) with approval, proactive suggestions, cost-based model routing, UA / EN everywhere, feedback loop into evals.

Rules for every backlog item: code decides and the model explains, no write without approval, per-farm data scoping, no invented products or doses, its own eval suite in CI, cost limits. When an item starts, it gets its own stage plan.

## Keeping the backlog possible
Core work does not build backlog features, but it avoids closing doors:
- The database image supports PostGIS so E2 needs no migration of the server (the extension is enabled only when E2 starts).
- `pending_actions` and the audit log are generic enough for log entries (E3) and plan items (E4).
- Repositories scope every query by user through one place, so a farm scope (E6) can be added without rewriting callers.
- The web app has an app shell with navigation, so new screens (map, log) slot in without a redesign.
