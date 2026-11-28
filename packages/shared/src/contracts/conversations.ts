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

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationsPage = z.infer<typeof conversationsPageSchema>;
export type RenameConversation = z.infer<typeof renameConversationSchema>;
