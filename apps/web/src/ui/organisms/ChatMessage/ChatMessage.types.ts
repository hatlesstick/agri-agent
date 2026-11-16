import type { AgriChatMessage } from "@agri/shared/contracts";

export type ChatMessageProps = { message: AgriChatMessage; isComplete: boolean };

export type UserMessageProps = { message: AgriChatMessage };

export type AssistantMessageProps = { message: AgriChatMessage; isComplete: boolean };
