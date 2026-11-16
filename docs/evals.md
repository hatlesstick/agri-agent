# Evals, model comparison and Langfuse

How the agent is measured. Scripts are listed in the README; results per model are in [model-comparison.md](model-comparison.md).

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

