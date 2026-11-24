import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Response } from "express";
import { SESSION_COOKIE } from "@/modules/identity/session/session.constants";
import { readSessionCookie, sessionCookieOptions } from "@/modules/identity/session/session-cookie";
import { SessionService } from "@/modules/identity/session/SessionService";
import type { SessionRequest } from "@/modules/identity/identity.types";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(SessionService) private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<SessionRequest>();
    const response = http.getResponse<Response>();
    const session = await this.sessions.resolve(readSessionCookie(request.headers.cookie));
    if (session.setCookie) response.cookie(SESSION_COOKIE, session.token, sessionCookieOptions);
    Object.assign(request, { userId: session.userId });
    return true;
  }
}
