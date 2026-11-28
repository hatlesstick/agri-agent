import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, sql } from "drizzle-orm";
import { DATABASE, type DatabaseHandle } from "@/database";
import { auditLog, pendingActions } from "@/database/schema";
import type { Decision, PendingActionRecord, ProposeInput } from "@/modules/approvals/approvals.types";

type Row = typeof pendingActions.$inferSelect;

function toRecord(row: Row): PendingActionRecord {
  return { id: row.id, userId: row.userId, type: row.type, payload: row.payload as Record<string, unknown>, status: row.status, expiresAt: row.expiresAt };
}

@Injectable()
export class PendingActionsRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async propose(userId: string, input: Omit<ProposeInput, "userId">): Promise<PendingActionRecord> {
    const [inserted] = await this.database
      .get()
      .insert(pendingActions)
      .values({ userId, channel: input.channel, type: input.type, payload: input.payload, expiresAt: input.expiresAt, idempotencyKey: input.idempotencyKey })
      .onConflictDoNothing({ target: [pendingActions.userId, pendingActions.idempotencyKey] })
      .returning();
    if (inserted) return toRecord(inserted);

    const [existing] = await this.database
      .get()
      .select()
      .from(pendingActions)
      .where(and(eq(pendingActions.userId, userId), eq(pendingActions.idempotencyKey, input.idempotencyKey)));
    if (!existing) throw new Error("idempotency key conflict: the existing action could not be read");
    if (existing.type !== input.type || JSON.stringify(existing.payload) !== JSON.stringify(input.payload)) {
      throw new Error("idempotency key reused for a different action");
    }
    return toRecord(existing);
  }

  async listAwaiting(userId: string, now: Date): Promise<PendingActionRecord[]> {
    const rows = await this.database
      .get()
      .select()
      .from(pendingActions)
      .where(and(eq(pendingActions.userId, userId), eq(pendingActions.status, "awaiting_confirmation"), gt(pendingActions.expiresAt, now)))
      .orderBy(pendingActions.createdAt);
    return rows.map(toRecord);
  }

  async find(userId: string, actionId: string): Promise<PendingActionRecord | null> {
    const rows = await this.database.get().select().from(pendingActions).where(and(eq(pendingActions.id, actionId), eq(pendingActions.userId, userId)));
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async claim(userId: string, actionId: string, decision: Decision, now: Date): Promise<PendingActionRecord | null> {
    const rows = await this.database
      .get()
      .update(pendingActions)
      .set({ status: decision, decidedBy: "user", decidedAt: now, updatedAt: now })
      .where(
        and(
          eq(pendingActions.id, actionId),
          eq(pendingActions.userId, userId),
          eq(pendingActions.status, "awaiting_confirmation"),
          gt(pendingActions.expiresAt, now),
        ),
      )
      .returning();
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async setStatus(userId: string, actionId: string, status: "executed" | "failed", now: Date): Promise<void> {
    await this.database
      .get()
      .update(pendingActions)
      .set({ status, updatedAt: now })
      .where(and(eq(pendingActions.id, actionId), eq(pendingActions.userId, userId)));
  }

  async audit(userId: string, actionId: string, action: string, payload: Record<string, unknown>): Promise<void> {
    await this.database.get().insert(auditLog).values({ userId, actor: "user", action, payload, pendingActionId: actionId });
  }

  async auditCount(userId: string, actionId: string): Promise<number> {
    const rows = await this.database
      .get()
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(and(eq(auditLog.userId, userId), eq(auditLog.pendingActionId, actionId)));
    return rows[0]?.count ?? 0;
  }
}
