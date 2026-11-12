import type React from "react";
import { ChatMessage } from "@/ui/organisms/ChatMessage";
import type { MessageListProps } from "./MessageList.types";

export const MessageList: React.FC<MessageListProps> = ({ messages, lastIsComplete }) => (
  <ul aria-label="Conversation" className="flex flex-1 flex-col gap-3">
    {messages.map((message, index) => (
      <ChatMessage key={message.id} message={message} isComplete={index < messages.length - 1 || lastIsComplete} />
    ))}
  </ul>
);
