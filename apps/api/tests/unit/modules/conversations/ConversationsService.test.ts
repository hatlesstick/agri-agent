import { describe, expect, it } from "vitest";
import { ConversationsService, PAGE_SIZE } from "@/modules/conversations/ConversationsService";
import type { ConversationRecord, ConversationsRepository } from "@/modules/conversations/repositories/ConversationsRepository";

function row(index: number): ConversationRecord {
  const at = new Date(Date.UTC(2026, 10, 28, 12, 0, 0) - index * 60_000);
  return { id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, userId: "u", channel: "web", externalChatId: null, title: null, createdAt: at, updatedAt: at };
}

function service(rows: ConversationRecord[]) {
  const seen: Array<{ before: Date | null; limit: number }> = [];
  const repository = {
    list: async (_user: string, before: Date | null, limit: number) => {
      seen.push({ before, limit });
      return rows.slice(0, limit);
    },
  } as unknown as ConversationsRepository;
  return { seen, service: new ConversationsService(repository) };
}

describe("ConversationsService.list", () => {
  it("returns one page and no cursor when the history fits", async () => {
    const { service: conversations } = service([row(0), row(1)]);
    const page = await conversations.list("u", null);
    expect(page.conversations).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it("returns a cursor set to the last shown item when more exist, and asks one extra row to know", async () => {
    const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => row(index));
    const { service: conversations, seen } = service(rows);
    const page = await conversations.list("u", null);
    expect(page.conversations).toHaveLength(PAGE_SIZE);
    expect(page.nextCursor).toBe(rows[PAGE_SIZE - 1].updatedAt.toISOString());
    expect(seen[0].limit).toBe(PAGE_SIZE + 1);
  });

  it("passes the cursor to the repository as the upper time bound", async () => {
    const { service: conversations, seen } = service([]);
    const cursor = new Date("2026-11-28T11:00:00Z");
    await conversations.list("u", cursor);
    expect(seen[0].before).toEqual(cursor);
  });
});
