# CLAUDE.md — agro-agent

## Overview
`agro-agent` is a tool-using AI agent that assesses field-spraying conditions from weather forecasts. It is built on the Vercel AI SDK, with a web chat as the first delivery channel.

### Capabilities
- Streams responses to the client.
- Selects and chains tools autonomously (weather → spray window → answer).
- Determines whether a field can be sprayed, identifies the best time window, and explains the decision.
- Exposes a structured endpoint returning `{ city, canSpray, bestWindow, reason }`.

### Scope
Release **P0+**: core agent (P0, stages 1–5) plus evaluation suite and retrieval-augmented answers (stages 6–7).

### Acceptance criteria
- **P0 (stage 5):** for the prompt "Чи можна завтра обприскувати в Луцьку?" ("Can I spray in Lutsk tomorrow?"), the agent invokes the required tools without guidance and returns a schema-valid answer with a rationale.
- **P0+ (stage 7):** `npm run eval` reports pass rates for every case on both the primary and fallback models; spraying-practice questions are answered from `data/docs/` with cited sources, or explicitly declined when no relevant source exists.

### Roadmap
This agent is the foundation for a Telegram agronomy bot: weather → spray window → RAG → field memory → photo diagnostics → multi-agent.

## Core principle: code decides, the model explains
- `canSpray` and `bestWindow` are computed by a **deterministic function** using the rules below.
- The model **never recomputes or overrides** that decision: it picks which tools to call and phrases `reason` in human language.
- **Large data never flows through the model.** The model passes only short parameters (`city`, `date`) to tools; tools fetch hourly data themselves from `lib/weather`.
- If the model and the rules disagree, the code wins.

## Architecture
```
              ┌─────────── lib/agent.ts ───────────┐
 /api/chat ──▶│  model, system prompt,             │
 (UI stream)  │  tools, stopWhen                   │
/api/spray- ─▶│                                    │
 check (JSON) └────────────────────────────────────┘
 (later Telegram)            │
                             ▼
                 lib/weather/ — Open-Meteo + in-memory cache
                 lib/spray/   — pure rules
```
- **Agent**: a single module `lib/agent.ts` holding the model, prompt, tools and loop limits. A `ToolLoopAgent` from stage 5.
- **Channels** (`app/api/*`, later Telegram) only pass messages to the agent and format the response. No agent logic lives in them.
- **Domain logic** (`lib/weather`, `lib/spray`) does not depend on the AI SDK and is tested separately.

## Tools
### `getWeather`
- Input: `{ city: string }` (the model may pass "Луцьк" or "Lutsk"; both must work).
- Geocoding → 3-day forecast → compact result: city, coordinates, `timezone`, hourly `temperature`, `windSpeed`, `precipitation`, `precipitationProbability`, `humidity`.
- Returns errors **as data**, not exceptions: `{ error: "city_not_found" }`, `{ error: "weather_unavailable" }`, so the model can explain them to the user.
- Why the agent needs it: general weather questions and showing what the verdict is based on.

### `sprayWindow`
- Input: `{ city: string, date: string }` (`date` is `"YYYY-MM-DD"`, the city's local date).
- Fetches weather itself via `lib/weather` (cached → no repeated Open-Meteo request).
- Output: `{ canSpray, bestWindow: { from, to } | null, windows: [...], rejectedReasons }`.
- Rules are a pure function in `lib/spray`; thresholds are **parameters with defaults**:
  - wind 1–4 m/s (lower bound: dead calm risks temperature inversion and drift);
  - no precipitation 3 h before and 3 h after;
  - temperature 10–25 °C;
  - relative humidity ≥ 50 % (optional, can be enabled later; Delta T next).

## Stack
- Node.js 22+ (AI SDK 7 requires Node 22+ and ESM)
- Next.js 16 (App Router), TypeScript (strict), Tailwind 4
- Vercel AI SDK 7: `ai`, `@ai-sdk/react`
- Models via **Vercel AI Gateway** (bundled in `ai`): env `AI_GATEWAY_API_KEY`, model set as a `"provider/model"` string (no separate provider packages).
  - Development model: **`google/gemini-2.5-flash-lite`** ($0.10 / $0.40 per 1M tokens, tool-use + structured-output; available on the Free Tier, tool calling verified 2026-11-11). Fallback: `openai/gpt-5.4-nano`.
  - `anthropic/claude-haiku-5.5` is **not available** on the Free Tier (requires paid credits).
  - The model name is a single constant in `lib/model.ts`.
- `zod` for tool schemas and structured output
- `vitest` for tests (added in stage 2)
- Open-Meteo API (no key):
  - geocoding: `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1&language=uk`
  - forecast: `https://api.open-meteo.com/v1/forecast` (hourly: `temperature_2m`, `precipitation`, `precipitation_probability`, `wind_speed_10m`, `relative_humidity_2m`; `wind_speed_unit=ms`; `timezone=auto`; `forecast_days=3`)
  - `forecast_days=3` because for "tomorrow" the "no rain 3 h after" rule needs hours from the day after.

## Time format
- All times are the **city's local time** as ISO without offset, as Open-Meteo returns with `timezone=auto`: `"2026-11-12T08:00"`.
- Tool results include a `timezone` field (e.g. `"Europe/Kyiv"`).
- No UTC in model responses.

## AI SDK 7 — verified APIs (ai@7.0.170)
Verified in `node_modules/ai/docs` and `dist/index.d.ts`. Re-check if the version changes.
- Streaming response: `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`. `result.toUIMessageStreamResponse()` is **deprecated**.
- UI → model: `await convertToModelMessages(messages)` (`UIMessage[]` → `ModelMessage[]`).
- Tools: `tool({ description, inputSchema, execute })`.
- Step limit: `stopWhen: isStepCount(n)` (**not** `stepCountIs`).
- Structured output: `generateText({ output: Output.object({ schema }) })`, can be combined with `tools`. `generateObject` is **deprecated**.
- Agent: `ToolLoopAgent` (default limit `isStepCount(20)`), see `docs/03-agents`.
- Embeddings: `embed`, `embedMany`, `cosineSimilarity`.
- Tools in the UI: message parts `tool-<name>` with states `input-streaming` / `input-available` / `output-available` / `output-error`.

## Stages (one at a time, stop after each)
### P0
1. **Chat without tools:** `lib/model.ts`, `app/api/chat/route.ts` with `streamText`, `app/page.tsx` with `useChat`. Explain how the stream flows from server to UI.
2. **Tool `getWeather`:** `lib/weather` (Open-Meteo + cache) and the tool wrapper. Tests with mocked `fetch`: success, city not found, 5xx, "Lutsk"/"Луцьк".
3. **Tool `sprayWindow`:** pure function in `lib/spray` + tool wrapper. Unit tests for each rule and boundary values (exactly 4 m/s, exactly 10 °C, rain exactly 3 h away).
4. **Structured output:** `/api/spray-check`, `generateText` with `tools` + `Output.object` + `stopWhen`; schema `{ city, canSpray, bestWindow: { from, to } | null, reason }` in `lib/schemas.ts`.
   - **Option A:** the model returns the whole object, and the code **overwrites** `canSpray` and `bestWindow` with values from the `sprayWindow` result (from `result.steps`). If the model wrote something different, `console.warn` with both values to surface model/rule disagreement.
   - If `sprayWindow` was not called, return an error instead of the model's guess.
5. **Agent behavior:** move logic into `lib/agent.ts` (`ToolLoopAgent`), system prompt (agronomist, answers in Ukrainian, never invents weather), `stopWhen: isStepCount(5)`, tool-call cards in the UI (name, arguments, state), README.

### P0+ extension
6. **Evals:** measure agent quality with a case set instead of eyeballing.
   - Cases in `evals/cases.ts`: user prompt + **weather fixture** (so the correct answer is known upfront) + expectations.
   - Weather in evals comes from fixtures via a stubbed `fetch`; the model is **real**, via AI Gateway.
   - Code-based checks (deterministic, these come first):
     - the right tools were called (`sprayWindow` for spraying questions; `getWeather` optional);
     - tool arguments are correct (`city`, `date`: "tomorrow" resolved to the right date);
     - `/spray-check` output passes the zod schema; `canSpray`/`bestWindow` match expectations;
     - the model did not "override" the decision (no `console.warn` from option A);
     - `reason` is in Ukrainian and mentions the rejection cause (wind / precipitation / temperature);
     - step count ≤ limit.
   - Case set: "can spray" / "can't because of wind / rain / temperature", nonexistent city, "Lutsk" in Latin script, non-spraying question (no tools needed), ambiguous date.
   - Each case runs N times (default 3) → **pass rate**, since the model is non-deterministic.
   - LLM-as-judge is optional, only for `reason` quality (does it invent numbers not present in tool data).
   - Report: table of cases with pass rate + comparison of two models (primary vs fallback).
   - Run via a separate `npm run eval` command (separate Vitest config), **not** in `npx vitest`: evals are slow, cost tokens and are non-deterministic.
7. **Small home-made RAG (no vector DB):** tool `searchDocs`.
   - Corpus: 5–10 short markdown documents in `data/docs/` (spraying rules, weather effects, general pesticide label requirements). Each file states its source.
   - Indexing via `npm run index`: chunk by headings → `embedMany` → `data/index.json` (chunk text, `source`, vector).
   - Embeddings: `google/gemini-embedding-001` (available on the Free Tier, verified 2026-11-11; `openai/text-embedding-3-small` is not available on the Free Tier). The model name is a constant in `lib/model.ts`.
   - Search: `embed(query)` → `cosineSimilarity` over all chunks in memory → top-k (k=3) with a similarity threshold.
   - Tool `searchDocs({ query })` → `[{ text, source, score }]`; the agent **cites sources** and says "I don't know" when nothing relevant is found.
   - Evals: retrieval recall@k on "question → expected source" pairs + answer-with-citation cases in the stage 6 set.
   - Why no vector DB: on dozens of chunks a brute-force scan is instant, and it exposes the whole RAG mechanism. Add a vector DB once the corpus grows.

## Future tools (next projects, not now)
`getField` / `saveFieldNote` (field memory), `diagnosePhoto` (photo diagnostics), then subagents.

## Working rules
- Briefly explain each new AI SDK API and the reasoning behind its use. After each stage, list 2–3 review questions.
- **One stage at a time.** Stop after each stage for manual verification and commit.
- **Don't invent APIs from memory:** the AI SDK changes between major versions. Check the installed version in `node_modules/ai` (`docs/` and types).
- Minimal dependencies; never add one without explaining why.
- Keys only in `.env.local`, never in code or commits. Template: `.env.example`.
- **Language:** code, commits, README, CLAUDE.md and all plans/docs in English. Chat communication in Ukrainian.
- Small commits, conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

## Code style
- **No comments in code**: not when creating files, not when editing. No `//`, `/* */`, JSDoc or "explaining what a line does".
- Clarity comes from names of variables, functions and types, and from small functions.
- Explain decisions in chat, not in code.
- Exception: only when a comment is explicitly requested.

## Commands
- `npm run dev`: local dev server
- `npm run lint`: lint
- `npx vitest`: tests (from stage 2)
- `npm run eval`: evals against the real model (from stage 6, costs tokens)
- `npm run index`: build the RAG index (from stage 7)

## Structure (approximate)
```
app/
  api/chat/route.ts          channel: web chat (stream)
  api/spray-check/route.ts   channel: structured JSON
  page.tsx
lib/
  model.ts                   model names (constants)
  agent.ts                   agent: model, prompt, tools, stopWhen (stage 5)
  schemas.ts                 zod schemas
  weather/                   Open-Meteo: geocoding, forecast, cache + tests
  spray/                     spraying rules (pure function) + tests
  tools/                     tool() wrappers over weather/, spray/, rag/
  rag/                       chunking, embeddings, search (stage 7)
evals/                       cases, weather fixtures, runner (stage 6)
data/
  docs/                      RAG corpus (stage 7)
  index.json                 generated index (stage 7)
scripts/
  build-index.ts             npm run index (stage 7)
```
