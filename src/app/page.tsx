"use client";

import { useChat } from "@ai-sdk/react";
import { useState, type FormEvent } from "react";
import type { AgriAgentUIMessage } from "@/agent";
import { currentActivity } from "@/app/_components/agent-activity";
import { AgentStatus } from "@/app/_components/agent-status";
import { ChatMessage } from "@/app/_components/chat-message";
import { friendlyChatError } from "@/app/_components/chat-errors";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, error, regenerate } = useChat<AgriAgentUIMessage>();
  const isBusy = status === "submitted" || status === "streaming";
  const [startedAt, setStartedAt] = useState(0);
  const lastMessage = messages.at(-1);
  const activity = currentActivity(status === "submitted" ? undefined : lastMessage);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    setStartedAt(Date.now());
    sendMessage({ text });
    setInput("");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Agri Agent</h1>

      <ul className="flex flex-1 flex-col gap-3">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isComplete={index < messages.length - 1 || status === "ready" || status === "error"}
          />
        ))}
      </ul>

      {isBusy && <AgentStatus activity={activity} startedAt={startedAt} />}

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          <span>{friendlyChatError(error.message)}</span>
          <button type="button" onClick={() => regenerate()} className="underline">
            Retry
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          placeholder="Ask about the weather or spraying…"
          disabled={isBusy}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 disabled:bg-zinc-100"
        />
        {isBusy ? (
          <button type="button" onClick={() => stop()} className="rounded-lg border border-zinc-300 px-4 py-2">
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
            Send
          </button>
        )}
      </form>
    </main>
  );
}
