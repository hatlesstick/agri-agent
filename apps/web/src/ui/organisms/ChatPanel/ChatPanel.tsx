"use client";

import type React from "react";
import { useAgentChat } from "@/ui/hooks/useAgentChat";
import { AgentStatus } from "@/ui/molecules/AgentStatus";
import { ErrorBanner } from "@/ui/molecules/ErrorBanner";
import { ChatComposer } from "@/ui/organisms/ChatComposer";
import { ChatScroller } from "@/ui/molecules/ChatScroller";
import { ForecastSaver } from "@/ui/organisms/ForecastSaver";
import { MessageList } from "@/ui/organisms/MessageList";

export const ChatPanel: React.FC = () => {
  const chat = useAgentChat();
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 rounded-[20px] border border-rule bg-surface p-4">
      <ForecastSaver messages={chat.messages} />
      <ChatScroller watch={chat.messages}>
        <MessageList messages={chat.messages} lastIsComplete={chat.lastIsComplete} onSuggest={chat.send} />
      </ChatScroller>
      {chat.isBusy && <AgentStatus activity={chat.activity} startedAt={chat.startedAt} />}
      {chat.errorMessage && <ErrorBanner message={chat.errorMessage} onRetry={chat.retry} />}
      <ChatComposer isBusy={chat.isBusy} onSend={chat.send} onStop={chat.stop} />
    </section>
  );
};
