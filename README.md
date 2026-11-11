# agro-agent

A tool-using AI agent that decides whether a field can be sprayed, based on the weather forecast.
Built with Next.js and the Vercel AI SDK 7; the first channel is a web chat, plus a structured JSON endpoint.

The model never makes the decision itself: a deterministic rule engine computes `canSpray` and the best
time window, and the model only chooses tools and explains the result in the user's language.

## Features

- Streaming chat with live tool-call cards (arguments, state, result summary).
- Tools: `getWeather` (Open-Meteo, 48 city-local hours) and `sprayWindow` (spraying rules).
- `POST /api/spray-check`: typed answer `{ city, canSpray, bestWindow, reason }`, reconciled with the rules.
- Mock model for token-free development, evals with pass rates, Langfuse tracing and scores.

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

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint, including layer boundary rules |
| `npm run eval` | Tool and agent evals with the mock model (free) |
| `npm run eval:real` | Agent and spray-check evals with the real model (costs tokens; `EVAL_RUNS=1` for a quick run) |

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
| 422 | `spray_window_not_called`: the question is not about spraying |
| 502 | `invalid_model_output`: no valid answer and no rule result to fall back to |

## Architecture

```
src/
  app/        UI and one-line route re-exports
  server/     HTTP handlers and HTTP guardrails
  agent/      ToolLoopAgent, instructions, tools, mock model, spray-check, evals, telemetry
  domain/     pure business logic: weather (Open-Meteo + cache), spray rules
  config/     zod-validated environment
```

Dependencies only point down (`app → server → agent → domain`), enforced by ESLint.
See `CLAUDE.md` for the detailed conventions.
