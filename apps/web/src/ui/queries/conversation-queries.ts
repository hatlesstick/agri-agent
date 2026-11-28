import {
  conversationMessagesPageSchema,
  conversationSchema,
  conversationsPageSchema,
  type Conversation,
  type ConversationMessagesPage,
  type ConversationsPage,
} from "@agri/shared/contracts";

export const conversationKeys = {
  list: ["conversations", "list"] as const,
};

export class ConversationRequestError extends Error {
  constructor(readonly status: number) {
    super(`conversation request failed: ${status}`);
    this.name = "ConversationRequestError";
  }
}

function withCursor(path: string, cursor: string | null): string {
  return cursor ? `${path}?cursor=${encodeURIComponent(cursor)}` : path;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { cache: "no-store", ...init });
  if (!response.ok) throw new ConversationRequestError(response.status);
  return response;
}

export async function fetchConversationsPage(cursor: string | null): Promise<ConversationsPage> {
  return conversationsPageSchema.parse(await (await request(withCursor("/api/conversations", cursor))).json());
}

export async function fetchConversationMessages(id: string, cursor: string | null): Promise<ConversationMessagesPage> {
  const path = withCursor(`/api/conversations/${encodeURIComponent(id)}/messages`, cursor);
  return conversationMessagesPageSchema.parse(await (await request(path)).json());
}

export async function createConversation(): Promise<Conversation> {
  return conversationSchema.parse(await (await request("/api/conversations", { method: "POST" })).json());
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const response = await request(`/api/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return conversationSchema.parse(await response.json());
}

export async function deleteConversation(id: string): Promise<void> {
  await request(`/api/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
}
