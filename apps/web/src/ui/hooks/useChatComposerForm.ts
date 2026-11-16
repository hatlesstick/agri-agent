"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { chatMessageFormSchema, type ChatMessageFormValues } from "@/ui/schemas/chat-message.schema";

export function useChatComposerForm(onSend: (text: string) => void) {
  const form = useForm<ChatMessageFormValues>({
    resolver: zodResolver(chatMessageFormSchema),
    defaultValues: { text: "" },
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit(({ text }) => {
    onSend(text);
    form.reset();
  });

  return {
    textField: form.register("text"),
    onSubmit,
    canSubmit: form.formState.isValid,
    error: form.formState.errors.text?.message ?? null,
  };
}
