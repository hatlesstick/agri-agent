import { Inject, Injectable } from "@nestjs/common";
import { ConversationsRepository, type ConversationRecord } from "@/modules/conversations/repositories/ConversationsRepository";

export const PAGE_SIZE = 20;

export type ConversationView = { id: string; title: string | null; createdAt: string; updatedAt: string };

function view(row: ConversationRecord): ConversationView {
  return { id: row.id, title: row.title, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

@Injectable()
export class ConversationsService {
  constructor(@Inject(ConversationsRepository) private readonly conversations: ConversationsRepository) {}

  async list(userId: string, cursor: Date | null): Promise<{ conversations: ConversationView[]; nextCursor: string | null }> {
    const rows = await this.conversations.list(userId, cursor, PAGE_SIZE + 1);
    const page = rows.slice(0, PAGE_SIZE);
    const more = rows.length > PAGE_SIZE;
    return { conversations: page.map(view), nextCursor: more && page.length > 0 ? page[page.length - 1].updatedAt.toISOString() : null };
  }

  async create(userId: string, now: Date): Promise<ConversationView> {
    return view(await this.conversations.create(userId, null, now));
  }

  async find(userId: string, id: string): Promise<ConversationView | null> {
    const row = await this.conversations.find(userId, id);
    return row ? view(row) : null;
  }

  async rename(userId: string, id: string, title: string, now: Date): Promise<ConversationView | null> {
    const row = await this.conversations.rename(userId, id, title, now);
    return row ? view(row) : null;
  }

  remove(userId: string, id: string): Promise<boolean> {
    return this.conversations.remove(userId, id);
  }
}
