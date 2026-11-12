"use client";

import type React from "react";
import { useAgentChat } from "@/ui/hooks/useAgentChat";
import { AgentStatus } from "@/ui/molecules/AgentStatus";
import { ErrorBanner } from "@/ui/molecules/ErrorBanner";
import { ChatComposer } from "@/ui/organisms/ChatComposer";
import { MessageList } from "@/ui/organisms/MessageList";
import { ChatTemplate } from "@/ui/templates/ChatTemplate";

export const ChatPage: React.FC = () => {
  const chat = useAgentChat();

  return (
    <ChatTemplate
      title="Agri Agent"
      messages={<MessageList messages={chat.messages} lastIsComplete={chat.lastIsComplete} />}
      status={chat.isBusy && <AgentStatus activity={chat.activity} startedAt={chat.startedAt} />}
      error={chat.errorMessage && <ErrorBanner message={chat.errorMessage} onRetry={chat.retry} />}
      composer={<ChatComposer isBusy={chat.isBusy} onSend={chat.send} onStop={chat.stop} />}
    />
  );
};
