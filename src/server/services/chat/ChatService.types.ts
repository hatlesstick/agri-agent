import type { UIMessage } from "ai";

export type ChatReplyInput = { messages: UIMessage[]; abortSignal?: AbortSignal; now?: Date };
