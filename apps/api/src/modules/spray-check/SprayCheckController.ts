import { Body, Controller, HttpCode, Inject, Post, Req, Res, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { sprayCheckRequestSchema, sprayCheckResponseSchema, type SprayCheckRequest, type SprayCheckResponse } from "@agri/shared/contracts";
import { problem } from "@/common/errors";
import { abortOnClose, ProxyAuthGuard, RateLimited, RateLimitGuard } from "@/common/http";
import { agentFailure } from "@/modules/agent";
import { ApiProblemResponses, openApiSchema } from "@/common/openapi";
import { TelemetryFlushInterceptor } from "@/observability";
import { SprayCheckService } from "@/modules/spray-check/SprayCheckService";
import type { SprayCheckFailure, SprayCheckOutcome } from "@/modules/spray-check/spray-check.types";

const ERROR_STATUS: Record<SprayCheckFailure, number> = {
  blocked_input: 422,
  spray_window_not_called: 422,
  invalid_model_output: 502,
};


@ApiTags("spray-check")
@Controller("spray-check")
@UseGuards(ProxyAuthGuard, RateLimitGuard)
@UseInterceptors(TelemetryFlushInterceptor)
export class SprayCheckController {
  constructor(@Inject(SprayCheckService) private readonly sprayCheck: SprayCheckService) {}

  @Post()
  @HttpCode(200)
  @RateLimited("sprayCheck")
  @ApiBody({ schema: openApiSchema(sprayCheckRequestSchema) })
  @ApiOkResponse({ description: "Rule-backed spray decision with a short explanation.", schema: openApiSchema(sprayCheckResponseSchema) })
  @ApiProblemResponses({ 400: ["invalid_request"], 403: ["forbidden"], 422: ["blocked_input", "spray_window_not_called"], 429: ["rate_limited"], 500: ["internal_error"], 502: ["invalid_model_output"], 503: ["model_busy"], 504: ["model_timeout"] })
  async check(
    @Body({ schema: sprayCheckRequestSchema }) body: SprayCheckRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SprayCheckResponse> {
    let outcome: SprayCheckOutcome;
    try {
      outcome = await this.sprayCheck.check({ question: body.question, abortSignal: abortOnClose(req, res) });
    } catch (error) {
      throw agentFailure(error, "spray-check");
    }
    if (!outcome.ok) throw problem(outcome.error, ERROR_STATUS[outcome.error]);
    return outcome.result;
  }
}
