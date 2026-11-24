import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";
import { DATABASE, type DatabaseHandle } from "@/database";
import { sessions } from "@/database/schema";
import type { Session } from "@/modules/identity/identity.types";
import { SESSION_TTL_MS } from "@/modules/identity/session/session.constants";

@Injectable()
export class SessionsRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async create(userId: string, tokenHash: string, now: Date): Promise<Session> {
    const [session] = await this.database
      .get()
      .insert(sessions)
      .values({ userId, tokenHash, createdAt: now, lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) })
      .returning();
    return session;
  }

  async findActive(tokenHash: string, now: Date): Promise<Session | null> {
    const [session] = await this.database
      .get()
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
      .limit(1);
    return session ?? null;
  }

  async touch(sessionId: string, now: Date): Promise<void> {
    await this.database
      .get()
      .update(sessions)
      .set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) })
      .where(eq(sessions.id, sessionId));
  }

  async delete(tokenHash: string): Promise<boolean> {
    const deleted = await this.database.get().delete(sessions).where(eq(sessions.tokenHash, tokenHash)).returning({ id: sessions.id });
    return deleted.length > 0;
  }
}
