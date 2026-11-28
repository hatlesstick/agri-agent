"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { AgriChatMessage, ConversationMessage } from "@agri/shared/contracts";
import { currentActivity } from "@/ui/helpers/agent-activity";
import { friendlyChatError } from "@/ui/helpers/chat-errors";
import { approvalKeys } from "@/ui/queries/approval-queries";
import { conversationKeys, createConversation, fetchConversationMessages } from "@/ui/queries/conversation-queries";

async function loadAllMessages(id: string): Promise<AgriChatMessage[]> {
  let messages: ConversationMessage[] = [];
  let cursor: string | null = null;
  do {
    const page = await fetchConversationMessages(id, cursor);
    messages = [...page.messages, ...messages];
    cursor = page.nextCursor;
  } while (cursor);
  return messages as AgriChatMessage[];
}

export function useAgentChat() {
  const [startedAt, setStartedAt] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const { messages, sendMessage, status, stop, error, regenerate, setMessages } = useChat<AgriChatMessage>();
  const isBusy = status === "submitted" || status === "streaming";

  const previousStatus = useRef(status);
  useEffect(() => {
    if (previousStatus.current !== "ready" && status === "ready") {
      void queryClient.invalidateQueries({ queryKey: approvalKeys.list });
      void queryClient.invalidateQueries({ queryKey: conversationKeys.list });
    }
    previousStatus.current = status;
  }, [status, queryClient]);

  async function send(text: string) {
    if (isBusy) return;
    setStartedAt(Date.now());
    if (!conversationRef.current) {
      const created = await createConversation().catch(() => null);
      if (created) {
        conversationRef.current = created.id;
        setConversationId(created.id);
      }
    }
    sendMessage({ text }, conversationRef.current ? { body: { conversationId: conversationRef.current } } : undefined);
  }

  function openConversation(id: string) {
    if (isBusy) stop();
    void loadAllMessages(id)
      .then((history) => {
        conversationRef.current = id;
        setConversationId(id);
        setMessages(history);
      })
      .catch(() => undefined);
  }

  function startNew() {
    if (isBusy) stop();
    conversationRef.current = null;
    setConversationId(null);
    setMessages([]);
  }

  return {
    messages,
    isBusy,
    lastIsComplete: status === "ready" || status === "error",
    activity: currentActivity(status === "submitted" ? undefined : messages.at(-1)),
    startedAt,
    conversationId,
    errorMessage: error ? friendlyChatError(error.message) : null,
    send,
    openConversation,
    startNew,
    stop: () => void stop(),
    retry: () => void regenerate(),
  };
}
