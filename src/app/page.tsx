"use client";

import { useChat } from "@ai-sdk/react";
import { useState, type FormEvent } from "react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, error, regenerate } = useChat();
  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Agro Agent</h1>

      <ul className="flex flex-1 flex-col gap-3">
        {messages.map((message) => (
          <li
            key={message.id}
            className={
              message.role === "user"
                ? "self-end rounded-lg bg-blue-600 px-4 py-2 text-white"
                : "self-start rounded-lg bg-zinc-100 px-4 py-2 text-zinc-900"
            }
          >
            {message.parts.map((part, index) => {
              const key = `${message.id}-${index}`;
              if (part.type === "text") {
                return (
                  <p key={key} className="whitespace-pre-wrap">
                    {part.text}
                  </p>
                );
              }
              if (part.type.startsWith("tool-")) {
                return (
                  <pre key={key} className="my-2 max-h-48 overflow-auto rounded bg-white p-2 text-xs text-zinc-700">
                    {JSON.stringify(part, null, 2)}
                  </pre>
                );
              }
              return null;
            })}
          </li>
        ))}
      </ul>

      {status === "submitted" && <p className="text-sm text-zinc-500">Thinking…</p>}

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          <span>Something went wrong.</span>
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
