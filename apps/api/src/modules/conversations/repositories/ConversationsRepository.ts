import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { DATABASE, type DatabaseHandle } from "@/database";
import { conversations, messages } from "@/database/schema";

export type ConversationRecord = typeof conversations.$inferSelect;

export type NewMessage = { role: "user" | "assistant"; parts: unknown[]; createdAt: Date };

@Injectable()
export class ConversationsRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async list(userId: string, before: Date | null, limit: number): Promise<ConversationRecord[]> {
    const where = before
      ? and(eq(conversations.userId, userId), lt(conversations.updatedAt, before))
      : eq(conversations.userId, userId);
    return this.database.get().select().from(conversations).where(where).orderBy(desc(conversations.updatedAt)).limit(limit);
  }

  async create(userId: string, title: string | null, now: Date): Promise<ConversationRecord> {
    const [row] = await this.database
      .get()
      .insert(conversations)
      .values({ userId, channel: "web", title, createdAt: now, updatedAt: now })
      .returning();
    return row;
  }

  async append(userId: string, id: string, input: { title: string | null; updatedAt: Date; messages: NewMessage[] }): Promise<boolean> {
    return this.database.get().transaction(async (tx) => {
      const owned = await tx
        .update(conversations)
        .set({ updatedAt: input.updatedAt, title: sql`coalesce(${conversations.title}, ${input.title})` })
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .returning({ id: conversations.id });
      if (owned.length === 0) return false;
      await tx.insert(messages).values(input.messages.map((message) => ({ conversationId: id, role: message.role, parts: message.parts, createdAt: message.createdAt })));
      return true;
    });
  }

  async find(userId: string, id: string): Promise<ConversationRecord | null> {
    const rows = await this.database.get().select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return rows[0] ?? null;
  }

  async rename(userId: string, id: string, title: string, now: Date): Promise<ConversationRecord | null> {
    const rows = await this.database
      .get()
      .update(conversations)
      .set({ title, updatedAt: now })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    return rows[0] ?? null;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const rows = await this.database
      .get()
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning({ id: conversations.id });
    return rows.length > 0;
  }
}
