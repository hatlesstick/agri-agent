import type { AgriAgentUIMessage } from "@agri/agent";

export type ChatMessageProps = { message: AgriAgentUIMessage; isComplete: boolean };

export type UserMessageProps = { message: AgriAgentUIMessage };

export type AssistantMessageProps = { message: AgriAgentUIMessage; isComplete: boolean };
