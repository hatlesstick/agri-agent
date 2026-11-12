# agri-agent — Step 1 report: production-grade process

Repository: https://github.com/hatlesstick/agri-agent (`main`)
Plan: Step 1 "close P0 open items" (CI, real-model evals in CI, model comparison incl. Amazon Bedrock, Langfuse Datasets/Experiments, secret hygiene), extended with an architecture refactor requested during the step.
Period: 2026-11-12.

## 1. Outcome

All Step 1 tooling is in place and merged; every pull request is gated by CI.

- **CI on every PR and push to `main`:** lint (with architecture boundary rules), typecheck, 200 unit and component tests, 93 deterministic/mock evals, production build, secret scan. Fully offline and without secrets.
- **Real-model evals** can be started manually from GitHub Actions, one run at a time.
- **Model comparison** covers four models, including Amazon Bedrock models through AI Gateway, with estimated cost, latency and pass rates rendered to `docs/model-comparison.md`.
- **Langfuse Datasets and Experiments** for the spray-check flow, with per-item and per-run scores.
- **Architecture** split into frontend (`app/`, `ui/`), backend API (`server/`), agent (`agent/`) and `shared/`, with all tests moved to `tests/`.

Real-model numbers are not filled in yet: those runs cost tokens and are started by the developer (see §6).

## 2. Stages delivered

| Stage | PR | Delivered |
|---|---|---|
| 1.1 CI | #1 | `.github/workflows/ci.yml`: jobs `checks` (lint → typecheck → unit tests → mock evals, eval results as artifact) and `build`; Node from `.nvmrc` (22), npm cache, `concurrency` per ref, read-only permissions; `CI_OFFLINE=1` guard makes any unstubbed `fetch` fail; CI badge. Verified with a throwaway PR whose broken eval turned CI red. |
| 1.5 Secret hygiene | #3 | gitleaks: full history (63 commits) and working tree clean (findings only in ignored `.env.local` and `.next/`); `gitleaks-action@v3` job in CI; GitHub secret scanning and push protection confirmed enabled; Open-Meteo URLs in CI read from repository secrets; unit test keeps `.env.example` complete (schema keys and every `process.env.*` read) and free of secret values. |
| 1.2 Real-model evals in CI | #4 | `eval-real.yml` (`workflow_dispatch`: `model`, `suite`, `runs`), `concurrency: eval-real` without cancellation, 30 min timeout, early failure when secrets are missing; traces tagged `ci` (`EVAL_TAGS`, validated) with `LANGFUSE_ENVIRONMENT=ci`; markdown job summary (`npm run eval:summary`) and results artifact. |
| Architecture refactor (added) | #6 | See §3. No behaviour changes. |
| 1.3 Model comparison | #7 | Candidates `google/gemini-2.5-flash-lite`, `openai/gpt-5.4-nano`, `amazon/nova-lite`, `amazon/nova-2-lite`; price table (read 2026-11-12) and estimated cost per case; `npm run eval:compare` writes `docs/model-comparison.md` (pass rate per suite, avg cost per case, p50/p95, infra errors, per-case table). |
| 1.4 Langfuse Datasets/Experiments | #8 | Dataset `agri-agent-spray-check` from the spray-check eval cases (stable ids, upsert); experiment runner with fixture weather, item scores `rule_consistency`, `tool_usage`, `steps`, `latency_ms`, run score `pass_rate`, model and prompt version in metadata; `--dry-run` without Langfuse (mock: 6/6). |
| 1.6 Summary | this PR | README quality-gates table, model comparison and experiments sections; this report. |

## 3. Architecture after the refactor

```
src/
  app/        Next.js routes only (page, layout, one-line API routes)
  ui/         atomic design: atoms, molecules, organisms, templates, pages; hooks, helpers, schemas
  server/     controllers, services, repositories (classes in per-feature folders), guardrails, helpers
  agent/      ToolLoopAgent, instructions, tools, model guardrails, RAG search, spray-check, mock model, telemetry
  shared/     env, shared limits, time and relative-day helpers
tests/        unit/ (mirrors src/, incl. component tests), evals/, fixtures/, support/
```

- **Frontend conventions:** one PascalCase folder per component with `<Component>.types.ts` and `index.ts`; components are `React.FC<Props>` and only render; state and effects live in hooks, formatting in helpers; forms use `react-hook-form` + `zod`, with limits shared with the server (`shared/config/chat-limits.ts`).
- **Backend conventions:** `ChatController`/`SprayCheckController` → `ChatService`/`SprayCheckService` → agent; spray rules in `SprayWindowService`; `WeatherRepository` (cache) over `OpenMeteoClient`; `DocsRepository`. Dependencies are passed through constructors, with a default singleton next to each class.
- **`domain/` removed:** rules moved to services, weather types to the weather repository, relative-day helpers to `shared/`, RAG ranking to `agent/rag`.
- **Boundaries enforced by ESLint** (`@typescript-eslint/no-restricted-imports`): per part, atomic order, type-only `@/agent` imports in `ui/`. The agent may use repositories and services that do not call the agent, which keeps the import graph acyclic. Each rule was verified with deliberate violations.
- **Component tests:** Vitest `components` project (jsdom + Testing Library) for Button, ErrorBanner, StepTimeline, ChatComposer and ToolCallCard.
- **Conventions documented in `CLAUDE.md`:** structure, where new code goes, dependency rules, naming, component, class and form patterns, testing layout.

## 4. Key decisions

- **Mocks on every PR, real models on demand.** This is standard practice: PR checks must be deterministic, fast, free and secret-free; real-model quality is measured manually or on a schedule and compared with baselines.
- **Two CI jobs instead of five.** Each job pays its own `npm ci`, while the checks themselves take seconds.
- **Offline guard instead of trust.** `CI_OFFLINE=1` replaces `fetch` in tests and evals, so a test that forgets a stub fails instead of calling Open-Meteo or a model.
- **Safety flags stay in the workflow file.** `CI_OFFLINE` and `AI_MOCK` are invariants, not settings; only service URLs and keys come from repository secrets.
- **Bedrock through AI Gateway.** The Gateway catalog serves Amazon Nova via Bedrock with tool-use and structured output, so no AWS account, credentials or `@ai-sdk/amazon-bedrock` are needed.
- **Estimated cost.** Exact cost per generation needs one `getGenerationInfo` call each, which would share the Free Tier rate limit; cost = average tokens × list price, with the price date recorded.
- **One source of truth for expected answers.** Spray-check cases and weather fixtures live in Vitest-free modules; evals and Langfuse experiments use the same `decisionFailures`.
- **Plans stay local** (`docs/plan-*.md` gitignored); reports and comparison results are committed.

## 5. Findings worth carrying forward

**Build and CI**
- `next build` evaluated runtime env because rate limiters were created at module load; it failed without `TRUSTED_PROXY_HOPS`. Limiters are now created on the first request, and invalid production env still fails fast there.
- `LayoutProps` and other Next.js route types are generated into `.next/`; a clean checkout needs `next typegen` before `tsc` (`npm run typecheck`). A local simulation missed this because `.next/` existed; CI caught it.
- In zsh an unquoted `$VAR` holding several `KEY=value` pairs is not word-split; a CI simulation silently ran without its env until arrays were used.

**Env and config**
- Empty eval variables (`EVAL_MODEL=` copied from `.env.example`) produced model `""` and 0 runs (16 failing evals); empty values are now treated as unset.
- The `.env.example` completeness test immediately caught a newly added `EVAL_TAGS`.

**Tooling**
- gitleaks-action needs no license for personal accounts; on PRs it scans only the PR's commits, so the full history was scanned locally once.
- Scripts run with `tsx` must not import modules that import `vitest` (`expect`, `vi`); shared eval code was split accordingly.
- Vitest does not typecheck: test fixtures with outdated types passed `npm test` and were caught by `npm run typecheck`.

**GitHub**
- A stacked PR is closed automatically when its base branch is deleted by a squash merge and cannot be reopened; it had to be recreated against `main` (#5 → #6). Merge the base first, then retarget and rebase the stacked branch before deleting the base.

## 6. Open items

**Developer actions**
- Rotate the AI Gateway and Langfuse keys (they were pasted into a chat during P0) and update `.env.local`.
- Add repository secrets for the real-model workflow: `AI_GATEWAY_API_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`.
- First real-model run from GitHub Actions (`suite: spray-check`, `runs: 1`).
- Model comparison: `EVAL_MODEL=<model> npm run eval:real` for each candidate, then `npm run eval:compare` and commit `docs/model-comparison.md`. Free Tier availability of Nova models is still unverified.
- Langfuse: `npm run langfuse:dataset`, two `npm run langfuse:experiment -- --model <id>` runs, compare in Datasets → Runs.

**Optional**
- Branch protection on `main` requiring the three CI checks.
- Storybook for UI components.
- Nightly scheduled real-model run with a pass-rate threshold and baseline comparison.
- Re-run real-model evals for the decision-affecting P0 review fixes (stale windows, rain buffer, override reason).

## 7. Skills practised

- GitHub Actions: jobs, caching, concurrency groups, `workflow_dispatch` inputs, job summaries, artifacts, repository secrets, least-privilege permissions, actionlint.
- Secret scanning with gitleaks and GitHub push protection.
- Evaluation operations: deterministic vs real-model evals, pass rates, cost and latency percentiles, model comparison, Langfuse datasets, experiments, item and run evaluators.
- AI Gateway provider routing (Bedrock-served models), catalog pricing and generation cost lookup.
- Frontend architecture: atomic design, component/props/hook separation, `react-hook-form` + `zod`, Testing Library with jsdom via Vitest projects.
- Backend architecture: controllers / services / repositories as classes, constructor injection, acyclic module boundaries enforced by ESLint.

## 8. Next steps

1. **P1 — Telegram channel:** `server/controllers/telegram` + `server/services/telegram` on top of `@/agent`; webhook, per-chat conversation state, location sharing (weather by coordinates), inline buttons, per-chat rate limits.
2. **P1.5 — LangGraph (Python) version of the core:** same tools and "code decides" rules, with LangSmith, for a second stack in the portfolio.
3. **P2 — Field memory:** Postgres (Neon), field and note repositories, write tools with approval, reminders via Workflow (`sleep` + hooks), RAG on pgvector.
4. **P3 — Photo diagnostics; P4 — multi-agent.**
