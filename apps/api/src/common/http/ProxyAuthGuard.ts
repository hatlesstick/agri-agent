import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { proxySecretMatches } from "@/common/http/client-key";
import { problem } from "@/common/http/problem";
import { API_ENV, type ApiEnv } from "@/config";

@Injectable()
export class ProxyAuthGuard implements CanActivate {
  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.env.PROXY_AUTH_SECRET) return true;
    const received = context.switchToHttp().getRequest<Request>().header("x-proxy-auth");
    if (proxySecretMatches(this.env.PROXY_AUTH_SECRET, received)) return true;
    throw problem("forbidden", 403);
  }
}
