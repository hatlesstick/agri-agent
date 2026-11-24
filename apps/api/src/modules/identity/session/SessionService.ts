import { Inject, Injectable } from "@nestjs/common";
import { CLOCK, type Clock } from "@/common/clock";
import { problem } from "@/common/errors";
import type { SessionResponse } from "@agri/shared/contracts";
import { IDENTITIES_REPOSITORY, SESSIONS_REPOSITORY, USERS_REPOSITORY } from "@/modules/identity/identity.tokens";
import type { IdentitiesPort, ResolvedSession, Session, SessionsPort, UsersPort } from "@/modules/identity/identity.types";
import { SESSION_TOUCH_INTERVAL_MS } from "@/modules/identity/session/session.constants";
import { hashSessionToken, newSessionToken } from "@/modules/identity/session/session-token";

@Injectable()
export class SessionService {
  constructor(
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsPort,
    @Inject(IDENTITIES_REPOSITORY) private readonly identities: IdentitiesPort,
    @Inject(USERS_REPOSITORY) private readonly users: UsersPort,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async resolve(token: string | undefined): Promise<ResolvedSession> {
    const now = this.clock();
    if (token) {
      const existing = await this.sessions.findActive(hashSessionToken(token), now);
      if (existing) return this.slide(existing, token, now);
    }
    return this.start(now);
  }

  async describe(userId: string): Promise<SessionResponse> {
    const user = await this.users.getById(userId);
    if (!user) throw problem("not_found", 404);
    return { userId: user.id, createdAt: user.createdAt.toISOString() };
  }

  private async slide(session: Session, token: string, now: Date): Promise<ResolvedSession> {
    const due = now.getTime() - session.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS;
    if (due) await this.sessions.touch(session.id, now);
    return { userId: session.userId, token, setCookie: due };
  }

  private async start(now: Date): Promise<ResolvedSession> {
    const token = newSessionToken();
    const { userId } = await this.identities.findOrCreateUser({ provider: "web", externalId: newSessionToken() });
    await this.sessions.create(userId, hashSessionToken(token), now);
    return { userId, token, setCookie: true };
  }
}
