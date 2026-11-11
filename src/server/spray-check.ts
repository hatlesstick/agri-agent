import { after } from "next/server";
import { flushAgentTelemetry, isTelemetryEnabled, runSprayCheck, screenInput, sprayCheckRequestSchema } from "@/agent";
import { readJsonBody } from "@/server/guardrails/chat-request";
import { checkRateLimit, rateLimitedResponse } from "@/server/guardrails/rate-limit";

const RATE_LIMITED = /RateLimit|Rate limit|429/i;
const TIMED_OUT = /AbortError|TimeoutError|timed out|Delay was aborted/i;

function failureResponse(error: unknown): Response {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  console.error("spray-check: agent error", text.slice(0, 300));
  if (RATE_LIMITED.test(text)) return Response.json({ error: "model_busy" }, { status: 503, headers: { "Retry-After": "60" } });
  if (TIMED_OUT.test(text)) return Response.json({ error: "model_timeout" }, { status: 504 });
  return Response.json({ error: "internal_error" }, { status: 500 });
}

const ERROR_STATUS = {
  spray_window_not_called: 422,
  invalid_model_output: 502,
} as const;

export async function handleSprayCheckRequest(req: Request): Promise<Response> {
  const limit = checkRateLimit(req, "sprayCheck");
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterMs);

  const body = await readJsonBody(req);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status });

  const request = sprayCheckRequestSchema.safeParse(body.body);
  if (!request.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const screen = screenInput(request.data.question);
  if (screen.verdict === "block") {
    console.warn("guardrail: spray-check input blocked", { reason: screen.reason });
    return Response.json({ error: "blocked_input" }, { status: 422 });
  }

  if (isTelemetryEnabled()) after(() => flushAgentTelemetry());

  let outcome: Awaited<ReturnType<typeof runSprayCheck>>;
  try {
    outcome = await runSprayCheck({ question: request.data.question, abortSignal: req.signal });
  } catch (error) {
    return failureResponse(error);
  }
  if (!outcome.ok) return Response.json({ error: outcome.error }, { status: ERROR_STATUS[outcome.error] });

  return Response.json(outcome.result);
}
