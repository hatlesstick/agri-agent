import { z } from "zod";

export const conversationSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const conversationsPageSchema = z.object({
  conversations: z.array(conversationSchema),
  nextCursor: z.iso.datetime().nullable(),
});

export const conversationMessageSchema = z.object({
  id: z.uuid(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.looseObject({ type: z.string() })),
  createdAt: z.iso.datetime(),
});

export const conversationMessagesPageSchema = z.object({
  messages: z.array(conversationMessageSchema),
  nextCursor: z.iso.datetime().nullable(),
});

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationsPage = z.infer<typeof conversationsPageSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type ConversationMessagesPage = z.infer<typeof conversationMessagesPageSchema>;
export type RenameConversation = z.infer<typeof renameConversationSchema>;
