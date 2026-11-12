"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import type { AgriAgentUIMessage } from "@/agent";
import { currentActivity } from "@/ui/helpers/agent-activity";
import { friendlyChatError } from "@/ui/helpers/chat-errors";

export function useAgentChat() {
  const [startedAt, setStartedAt] = useState(0);
  const { messages, sendMessage, status, stop, error, regenerate } = useChat<AgriAgentUIMessage>();
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
