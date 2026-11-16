import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { clientKey } from "@/common/http/client-key";
import { problem } from "@/common/errors";
import { checkLimits, GLOBAL_KEY, RATE_LIMITERS, type RateLimitedRoute, type RateLimiters } from "@/common/rate-limit";
import { RATE_LIMITED_ROUTE } from "@/common/http/rate-limited.decorator";
import { API_ENV, type ApiEnv } from "@/config";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RATE_LIMITERS) private readonly limiters: RateLimiters,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const route = this.reflector.get<RateLimitedRoute | undefined>(RATE_LIMITED_ROUTE, context.getHandler());
    if (!route) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const key = clientKey({ proxySecret: this.env.PROXY_AUTH_SECRET, headers: request.headers, ip: request.ip });
    const decision = checkLimits([
      { limiter: this.limiters.routes[route], key },
      { limiter: this.limiters.global, key: GLOBAL_KEY },
    ]);
    if (decision.allowed) return true;
    throw problem("rate_limited", 429, undefined, { "Retry-After": String(Math.max(1, Math.ceil(decision.retryAfterMs / 1000))) });
  }
}
