import type React from "react";
import { AssistantMessage } from "./AssistantMessage";
import type { ChatMessageProps } from "./ChatMessage.types";
import { UserMessage } from "./UserMessage";

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isComplete }) =>
  message.role === "user" ? <UserMessage message={message} /> : <AssistantMessage message={message} isComplete={isComplete} />;
