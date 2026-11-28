import { describe, expect, it } from "vitest";
import { ConversationsService, MESSAGES_PAGE_SIZE } from "@/modules/conversations/ConversationsService";
import type { ConversationsRepository, MessageRecord } from "@/modules/conversations/repositories/ConversationsRepository";

function message(index: number): MessageRecord {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    conversationId: "00000000-0000-4000-8000-000000000001",
    role: index % 2 === 0 ? "user" : "assistant",
    parts: [{ type: "text", text: `m${index}` }],
    createdAt: new Date(Date.UTC(2026, 10, 28, 12, 0, 0) - index * 1000),
  };
}

function service(rows: MessageRecord[]) {
  const repository = {
    find: async () => ({ id: "c" }),
    listMessages: async (_user: string, _id: string, _before: Date | null, limit: number) => rows.slice(0, limit),
  } as unknown as ConversationsRepository;
  return new ConversationsService(repository);
}

describe("ConversationsService.listMessages", () => {
  it("returns the page oldest first and no cursor when the conversation fits", async () => {
    const page = await service([message(0), message(1)]).listMessages("u", "c", null);
    expect(page.messages.map((m) => m.parts)).toEqual([[{ type: "text", text: "m1" }], [{ type: "text", text: "m0" }]]);
    expect(page.nextCursor).toBeNull();
  });

  it("gives a cursor pointing at the oldest shown message when older ones exist", async () => {
    const rows = Array.from({ length: MESSAGES_PAGE_SIZE + 1 }, (_, index) => message(index));
    const page = await service(rows).listMessages("u", "c", null);
    expect(page.messages).toHaveLength(MESSAGES_PAGE_SIZE);
    expect(page.nextCursor).toBe(rows[MESSAGES_PAGE_SIZE - 1].createdAt.toISOString());
  });

  it("refuses a conversation the user does not own", async () => {
    const repository = { find: async () => null } as unknown as ConversationsRepository;
    await expect(new ConversationsService(repository).listMessages("u", "c", null)).rejects.toMatchObject({ status: 404 });
  });
});
