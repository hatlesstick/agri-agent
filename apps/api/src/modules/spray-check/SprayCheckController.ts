import { Body, Controller, HttpCode, Inject, Post, Req, Res, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { sprayCheckRequestSchema, sprayCheckResponseSchema, type SprayCheckRequest, type SprayCheckResponse } from "@agri/shared/contracts";
import { abortOnClose, agentFailure, problem, ProxyAuthGuard, RateLimited, RateLimitGuard } from "@/common/http";
import { openApiSchema } from "@/common/validation";
import { TelemetryFlushInterceptor } from "@/observability";
import { SprayCheckService } from "@/modules/spray-check/SprayCheckService";
import type { SprayCheckFailure, SprayCheckOutcome } from "@/modules/spray-check/SprayCheckService.types";

const ERROR_STATUS: Record<SprayCheckFailure, number> = {
  blocked_input: 422,
  spray_window_not_called: 422,
  invalid_model_output: 502,
};

const problemResponse = { content: { "application/problem+json": { schema: { $ref: "#/components/schemas/ProblemDetails" } } } };

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
  @ApiResponse({ status: 400, description: "invalid_request", ...problemResponse })
  @ApiResponse({ status: 422, description: "blocked_input or spray_window_not_called", ...problemResponse })
  @ApiResponse({ status: 429, description: "rate_limited", ...problemResponse })
  @ApiResponse({ status: 502, description: "invalid_model_output", ...problemResponse })
  @ApiResponse({ status: 503, description: "model_busy", ...problemResponse })
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
