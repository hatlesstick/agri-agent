import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { authProvidersResponseSchema, type AuthProvidersResponse } from "@agri/shared/contracts";
import { ProxyAuthGuard } from "@/common/http";
import { openApiSchema } from "@/common/openapi";
import { API_ENV, type ApiEnv } from "@/config";
import { enabledProviders } from "@/modules/identity/auth/oauth-providers";

@ApiTags("auth")
@Controller("auth")
@UseGuards(ProxyAuthGuard)
export class AuthController {
  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  @Get("providers")
  @ApiResponse({
    status: 200,
    description: "The sign-in providers configured on this deployment.",
    content: { "application/json": { schema: openApiSchema(authProvidersResponseSchema) } },
  })
  providers(): AuthProvidersResponse {
    return { providers: enabledProviders(this.env) };
  }
}
