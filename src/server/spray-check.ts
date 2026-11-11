import { runSprayCheck, screenInput, sprayCheckRequestSchema } from "@/agent";
import { readJsonBody } from "@/server/guardrails/chat-request";
import { checkRateLimit, rateLimitedResponse } from "@/server/guardrails/rate-limit";

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

  const outcome = await runSprayCheck({ question: request.data.question, abortSignal: req.signal });
  if (!outcome.ok) return Response.json({ error: outcome.error }, { status: ERROR_STATUS[outcome.error] });

  return Response.json(outcome.result);
}
