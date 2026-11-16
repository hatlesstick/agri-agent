import type { AgriChatMessage } from "@agri/shared/contracts";

export type MessageListProps = { messages: AgriChatMessage[]; lastIsComplete: boolean };
