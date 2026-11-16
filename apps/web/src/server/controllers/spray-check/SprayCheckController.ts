import { after } from "next/server";
import { flushAgentTelemetry, isTelemetryEnabled, sprayCheckRequestSchema } from "@/agent";
import { readJsonBody } from "@/server/guardrails/chat-request";
import { checkRateLimit, rateLimitedResponse } from "@/server/guardrails/rate-limit";
import { agentFailureResponse } from "@/server/helpers/agent-errors";
import { jsonError } from "@/server/helpers/http-responses";
import { sprayCheckService, type SprayCheckService } from "@/server/services/spray-check/SprayCheckService";
import type { SprayCheckFailure, SprayCheckOutcome } from "@/server/services/spray-check/SprayCheckService.types";

const ERROR_STATUS: Record<SprayCheckFailure, number> = {
  blocked_input: 422,
  spray_window_not_called: 422,
  invalid_model_output: 502,
};

export class SprayCheckController {
  constructor(private readonly sprayCheck: SprayCheckService) {}

  handle = async (req: Request): Promise<Response> => {
    const limit = checkRateLimit(req, "sprayCheck");
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfterMs);

    const body = await readJsonBody(req);
    if (!body.ok) return jsonError(body.error, body.status);

    const request = sprayCheckRequestSchema.safeParse(body.body);
    if (!request.success) return jsonError("invalid_request", 400);

    if (isTelemetryEnabled()) after(() => flushAgentTelemetry());

    let outcome: SprayCheckOutcome;
    try {
      outcome = await this.sprayCheck.check({ question: request.data.question, abortSignal: req.signal });
    } catch (error) {
      return agentFailureResponse(error, "spray-check");
    }
    if (!outcome.ok) return jsonError(outcome.error, ERROR_STATUS[outcome.error]);

    return Response.json(outcome.result);
  };
}

export const sprayCheckController = new SprayCheckController(sprayCheckService);
