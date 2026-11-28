import { Inject, Injectable } from "@nestjs/common";
import type { ConversationMessage } from "@agri/shared/contracts";
import { problem } from "@/common/errors";
import { ConversationsRepository, type ConversationRecord, type MessageRecord, type NewMessage } from "@/modules/conversations/repositories/ConversationsRepository";

const TITLE_MAX_CHARS = 60;

export const PAGE_SIZE = 20;
export const MESSAGES_PAGE_SIZE = 50;

export type ConversationView = { id: string; title: string | null; createdAt: string; updatedAt: string };
export type MessageView = { id: string; role: "user" | "assistant"; parts: ConversationMessage["parts"]; createdAt: string };

function messageView(row: MessageRecord): MessageView {
  return { id: row.id, role: row.role, parts: row.parts as ConversationMessage["parts"], createdAt: row.createdAt.toISOString() };
}

function view(row: ConversationRecord): ConversationView {
  return { id: row.id, title: row.title, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function message(role: NewMessage["role"], parts: unknown[], createdAt: Date): NewMessage {
  return { role, parts, createdAt };
}

function titleFrom(parts: unknown[]): string | null {
  const text = parts
    .map((part) => (typeof part === "object" && part !== null && "type" in part && part.type === "text" && "text" in part && typeof part.text === "string" ? part.text : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, TITLE_MAX_CHARS) : null;
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

  async listMessages(userId: string, id: string, cursor: Date | null): Promise<{ messages: MessageView[]; nextCursor: string | null }> {
    await this.assertOwned(userId, id);
    const rows = await this.conversations.listMessages(userId, id, cursor, MESSAGES_PAGE_SIZE + 1);
    const page = rows.slice(0, MESSAGES_PAGE_SIZE);
    const oldest = page.at(-1);
    const more = rows.length > MESSAGES_PAGE_SIZE && oldest !== undefined;
    return { messages: page.reverse().map(messageView), nextCursor: more ? oldest.createdAt.toISOString() : null };
  }

  async assertOwned(userId: string, id: string): Promise<void> {
    if (!(await this.conversations.find(userId, id))) throw problem("not_found", 404);
  }

  async recordUserMessage(userId: string, id: string, parts: unknown[], now: Date): Promise<void> {
    const saved = await this.conversations.append(userId, id, { title: titleFrom(parts), updatedAt: now, messages: [message("user", parts, now)] });
    if (!saved) throw problem("not_found", 404);
  }

  async recordAssistantMessage(userId: string, id: string, parts: unknown[], now: Date): Promise<void> {
    await this.conversations.append(userId, id, { title: null, updatedAt: now, messages: [message("assistant", parts, now)] });
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
