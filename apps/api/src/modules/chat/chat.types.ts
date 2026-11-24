import type { UIMessage } from "ai";

export type ChatReplyInput = { userId: string; messages: UIMessage[]; abortSignal?: AbortSignal };
