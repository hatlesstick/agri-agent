import { z } from "zod";
import { CHAT_LIMITS } from "@agri/shared";

export const chatMessageFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Type a message")
    .max(CHAT_LIMITS.maxMessageChars, `Keep it under ${CHAT_LIMITS.maxMessageChars} characters`),
});

export type ChatMessageFormValues = z.infer<typeof chatMessageFormSchema>;
