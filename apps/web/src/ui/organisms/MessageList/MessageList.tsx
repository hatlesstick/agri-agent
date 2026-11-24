"use client";

import type React from "react";
import { useT } from "@/ui/hooks/useT";
import { ChatMessage } from "@/ui/organisms/ChatMessage";
import type { MessageListProps } from "./MessageList.types";

export const MessageList: React.FC<MessageListProps> = ({ messages, lastIsComplete }) => {
  const t = useT();
  if (messages.length === 0) return <p className="text-sm text-ink-soft">{t("chat.examples")}</p>;
  return (
    <ul aria-label={t("chat.conversation")} className="flex flex-1 flex-col gap-3">
      {messages.map((message, index) => (
        <ChatMessage key={message.id} message={message} isComplete={index < messages.length - 1 || lastIsComplete} />
      ))}
    </ul>
  );
};
