import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { sessionResponseSchema, type SessionResponse } from "@agri/shared/contracts";
import { ProxyAuthGuard, RateLimited, RateLimitGuard } from "@/common/http";
import { ApiProblemResponses, openApiSchema } from "@/common/openapi";
import { CurrentUserId } from "@/modules/identity/session/current-user-id.decorator";
import { SessionGuard } from "@/modules/identity/session/SessionGuard";
import { SessionService } from "@/modules/identity/session/SessionService";

@ApiTags("session")
@Controller("session")
@UseGuards(ProxyAuthGuard, RateLimitGuard, SessionGuard)
export class SessionController {
  constructor(@Inject(SessionService) private readonly sessions: SessionService) {}

  @Get()
  @RateLimited("session")
  @ApiResponse({
    status: 200,
    description: "The anonymous or signed-in user of this browser.",
    content: { "application/json": { schema: openApiSchema(sessionResponseSchema) } },
  })
  @ApiProblemResponses({ 403: ["forbidden"], 404: ["not_found"], 429: ["rate_limited"] })
  current(@CurrentUserId() userId: string): Promise<SessionResponse> {
    return this.sessions.describe(userId);
  }
}
