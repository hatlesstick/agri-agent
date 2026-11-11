import { runSprayCheck, sprayCheckRequestSchema } from "@/agent";
import { readJsonBody } from "@/server/guardrails/chat-request";

const ERROR_STATUS = {
  spray_window_not_called: 422,
  invalid_model_output: 502,
} as const;

export async function handleSprayCheckRequest(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status });

  const request = sprayCheckRequestSchema.safeParse(body.body);
  if (!request.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const outcome = await runSprayCheck({ question: request.data.question });
  if (!outcome.ok) return Response.json({ error: outcome.error }, { status: ERROR_STATUS[outcome.error] });

  return Response.json(outcome.result);
}
