"use client";

import type React from "react";
import { Button } from "@/ui/atoms/Button";
import { TextInput } from "@/ui/atoms/TextInput";
import { useChatComposerForm } from "@/ui/hooks/useChatComposerForm";
import { useT } from "@/ui/hooks/useT";
import type { ChatComposerProps } from "./ChatComposer.types";

export const ChatComposer: React.FC<ChatComposerProps> = ({ isBusy, onSend, onStop }) => {
  const { textField, onSubmit, canSubmit, error } = useChatComposerForm(onSend);
  const t = useT();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <TextInput
          {...textField}
          aria-label={t("chat.message")}
          aria-invalid={error ? true : undefined}
          placeholder={t("chat.placeholder")}
          disabled={isBusy}
        />
        {isBusy ? (
          <Button variant="secondary" onClick={onStop}>
            {t("chat.stop")}
          </Button>
        ) : (
          <Button type="submit" disabled={!canSubmit}>
            {t("chat.send")}
          </Button>
        )}
      </div>
      {error && error !== "Type a message" && <p className="text-xs text-stop">{error}</p>}
    </form>
  );
};
