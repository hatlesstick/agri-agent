import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { FieldsList } from "@agri/shared/contracts";
import { ProxyAuthGuard, RateLimited, RateLimitGuard } from "@/common/http";
import { ApiProblemResponses } from "@/common/openapi";
import { CurrentUserId, SessionGuard } from "@/modules/identity";
import { FieldsService } from "@/modules/fields/FieldsService";

@ApiTags("fields")
@Controller("fields")
@UseGuards(ProxyAuthGuard, RateLimitGuard, SessionGuard)
export class FieldsController {
  constructor(@Inject(FieldsService) private readonly fields: FieldsService) {}

  @Get()
  @RateLimited("session")
  @ApiProblemResponses({ 403: ["forbidden"], 429: ["rate_limited"] })
  list(@CurrentUserId() userId: string): Promise<FieldsList> {
    return this.fields.list(userId);
  }
}
