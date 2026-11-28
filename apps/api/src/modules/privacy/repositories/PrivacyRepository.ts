import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DATABASE, type DatabaseHandle } from "@/database";
import { auditLog, conversations, fields, pendingActions, usageDaily } from "@/database/schema";

export type ForgetCounts = { fields: number; actions: number; conversations: number };

@Injectable()
export class PrivacyRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async forget(userId: string): Promise<ForgetCounts> {
    return this.database.get().transaction(async (tx) => {
      const deletedFields = await tx.delete(fields).where(eq(fields.userId, userId)).returning({ id: fields.id });
      const deletedActions = await tx.delete(pendingActions).where(eq(pendingActions.userId, userId)).returning({ id: pendingActions.id });
      const deletedConversations = await tx.delete(conversations).where(eq(conversations.userId, userId)).returning({ id: conversations.id });
      await tx.delete(usageDaily).where(eq(usageDaily.userId, userId));
      await tx.update(auditLog).set({ payload: sql`'{}'::jsonb` }).where(eq(auditLog.userId, userId));
      return { fields: deletedFields.length, actions: deletedActions.length, conversations: deletedConversations.length };
    });
  }
}
