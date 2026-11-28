"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AgriChatMessage } from "@agri/shared/contracts";
import { currentActivity } from "@/ui/helpers/agent-activity";
import { friendlyChatError } from "@/ui/helpers/chat-errors";
import { approvalKeys } from "@/ui/queries/approval-queries";

export function useAgentChat() {
  const [startedAt, setStartedAt] = useState(0);
  const { messages, sendMessage, status, stop, error, regenerate } = useChat<AgriChatMessage>();
  const queryClient = useQueryClient();
  const previousStatus = useRef(status);
  useEffect(() => {
    if (previousStatus.current !== "ready" && status === "ready") {
      void queryClient.invalidateQueries({ queryKey: approvalKeys.list });
    }
    previousStatus.current = status;
  }, [status, queryClient]);
  const isBusy = status === "submitted" || status === "streaming";

  function send(text: string) {
    if (isBusy) return;
    setStartedAt(Date.now());
    sendMessage({ text });
  }

  return {
    messages,
    isBusy,
    lastIsComplete: status === "ready" || status === "error",
    activity: currentActivity(status === "submitted" ? undefined : messages.at(-1)),
    startedAt,
    errorMessage: error ? friendlyChatError(error.message) : null,
    send,
    stop: () => void stop(),
    retry: () => void regenerate(),
  };
}
