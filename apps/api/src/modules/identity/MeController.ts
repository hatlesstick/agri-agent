import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { meResponseSchema, type MeResponse } from "@agri/shared/contracts";
import { ProxyAuthGuard } from "@/common/http";
import { ApiProblemResponses, openApiSchema } from "@/common/openapi";
import { AccountService } from "@/modules/identity/AccountService";
import { CurrentUserId } from "@/modules/identity/session/current-user-id.decorator";
import { SessionGuard } from "@/modules/identity/session/SessionGuard";

@ApiTags("session")
@Controller("me")
@UseGuards(ProxyAuthGuard, SessionGuard)
export class MeController {
  constructor(@Inject(AccountService) private readonly account: AccountService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: "The current visitor: anonymous or signed in, with the linked providers and profile.",
    content: { "application/json": { schema: openApiSchema(meResponseSchema) } },
  })
  @ApiProblemResponses({ 403: ["forbidden"], 404: ["not_found"] })
  me(@CurrentUserId() userId: string): Promise<MeResponse> {
    return this.account.describe(userId);
  }
}
