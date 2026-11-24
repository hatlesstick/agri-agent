import { Controller, Get, HttpCode, Inject, Param, Post, Query, Req, Res, Next, UseGuards } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import { authProvidersResponseSchema, type AuthProvidersResponse } from "@agri/shared/contracts";
import { problem } from "@/common/errors";
import { ProxyAuthGuard } from "@/common/http";
import { openApiSchema } from "@/common/openapi";
import { sessionCookieOptions } from "@/modules/identity/session/session-cookie";
import { SESSION_COOKIE } from "@/modules/identity/session/session.constants";
import { readCookie, readSessionCookie } from "@/modules/identity/session/session-cookie";
import { OAUTH_RUNTIME } from "@/modules/identity/auth/auth.tokens";
import type { OAuthOutcome, OAuthProvider, ProviderIdentity } from "@/modules/identity/auth/auth.types";
import { OAUTH_FLOW_COOKIE, decodeFlowCookie } from "@/modules/identity/auth/oauth-flow";
import { isOAuthProvider } from "@/modules/identity/auth/oauth-providers";
import { type OAuthRuntime } from "@/modules/identity/auth/passport-strategies";
import { OAuthService, type AuthorizeQuery } from "@/modules/identity/auth/OAuthService";
import { SessionService } from "@/modules/identity/session/SessionService";

@ApiTags("auth")
@Controller("auth")
@UseGuards(ProxyAuthGuard)
export class AuthController {
  constructor(
    @Inject(OAUTH_RUNTIME) private readonly runtime: OAuthRuntime,
    @Inject(OAuthService) private readonly oauth: OAuthService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  @Post("sign-out")
  @HttpCode(204)
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.sessions.signOut(readSessionCookie(req.headers.cookie));
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  }

  @Get("providers")
  @ApiResponse({
    status: 200,
    description: "The sign-in providers configured on this deployment.",
    content: { "application/json": { schema: openApiSchema(authProvidersResponseSchema) } },
  })
  providers(): AuthProvidersResponse {
    return { providers: this.runtime.providers };
  }

  @Get(":provider/start")
  start(@Param("provider") provider: string, @Req() req: Request, @Res() res: Response, @Next() next: NextFunction): void {
    this.requireProvider(provider);
    this.runtime.passport.authenticate(provider, { session: false })(req, res, next);
  }

  @Get(":provider/callback")
  async callback(@Param("provider") provider: string, @Query() query: AuthorizeQuery, @Req() req: Request, @Res() res: Response, @Next() next: NextFunction): Promise<void> {
    this.requireProvider(provider);
    const flowCookie = readCookie(req.headers.cookie, OAUTH_FLOW_COOKIE);
    res.clearCookie(OAUTH_FLOW_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    const early = this.oauth.precheck(provider, query, flowCookie);
    if (early) return this.redirectWith(res, early);

    const returnTo = decodeFlowCookie(flowCookie)?.returnTo;
    const sessionToken = readSessionCookie(req.headers.cookie);
    await new Promise<void>((resolve, reject) => {
      this.runtime.passport.authenticate(provider, { session: false }, (error: unknown, identity?: ProviderIdentity | false) => {
        this.finish(res, provider, error ? undefined : identity || undefined, sessionToken, returnTo).then(resolve, reject);
      })(req, res, next);
    });
  }

  private async finish(res: Response, provider: OAuthProvider, identity: ProviderIdentity | undefined, sessionToken: string | undefined, returnTo: string | undefined): Promise<void> {
    const outcome: OAuthOutcome = identity ? await this.oauth.complete(provider, identity, sessionToken, returnTo) : { ok: false, code: "provider_error" };
    if (outcome.ok) res.cookie(SESSION_COOKIE, outcome.sessionToken, sessionCookieOptions);
    this.redirectWith(res, outcome);
  }

  private redirectWith(res: Response, outcome: OAuthOutcome): void {
    res.redirect(302, this.oauth.appUrl(outcome.ok ? outcome.returnTo : `/?auth_error=${outcome.code}`));
  }

  private requireProvider(provider: string): asserts provider is OAuthProvider {
    if (!isOAuthProvider(provider) || !this.runtime.providers.includes(provider)) throw problem("not_found", 404);
  }
}
