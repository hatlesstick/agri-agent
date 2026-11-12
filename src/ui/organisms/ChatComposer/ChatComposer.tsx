"use client";

import type React from "react";
import { Button } from "@/ui/atoms/Button";
import { TextInput } from "@/ui/atoms/TextInput";
import { useChatComposerForm } from "@/ui/hooks/useChatComposerForm";
import type { ChatComposerProps } from "./ChatComposer.types";

export const ChatComposer: React.FC<ChatComposerProps> = ({ isBusy, onSend, onStop }) => {
  const { textField, onSubmit, canSubmit, error } = useChatComposerForm(onSend);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <TextInput
          {...textField}
          aria-label="Message"
          aria-invalid={error ? true : undefined}
          placeholder="Ask about the weather or spraying…"
          disabled={isBusy}
        />
        {isBusy ? (
          <Button variant="secondary" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!canSubmit}>
            Send
          </Button>
        )}
      </div>
      {error && error !== "Type a message" && <p className="text-xs text-red-700">{error}</p>}
    </form>
  );
};
