"use client";

import type React from "react";
import { useT } from "@/ui/hooks/useT";
import { ChatMessage } from "@/ui/organisms/ChatMessage";
import type { MessageListProps } from "./MessageList.types";

const SUGGESTIONS = [
  { key: "chat.suggest.1", id: "suggest-1" },
  { key: "chat.suggest.2", id: "suggest-2" },
  { key: "chat.suggest.3", id: "suggest-3" },
] as const;

export const MessageList: React.FC<MessageListProps> = ({ messages, lastIsComplete, onSuggest }) => {
  const t = useT();
  if (messages.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">{t("chat.examples")}</p>
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSuggest?.(t(item.key))}
              className="min-h-11 rounded-xl border border-rule px-4 py-2 text-left text-sm text-ink hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-ink"
            >
              {t(item.key)}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <ul aria-label={t("chat.conversation")} className="flex flex-1 flex-col gap-3">
      {messages.map((message, index) => (
        <ChatMessage key={message.id} message={message} isComplete={index < messages.length - 1 || lastIsComplete} />
      ))}
    </ul>
  );
};
