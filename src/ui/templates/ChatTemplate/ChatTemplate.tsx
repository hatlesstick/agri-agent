import type React from "react";
import type { ChatTemplateProps } from "./ChatTemplate.types";

export const ChatTemplate: React.FC<ChatTemplateProps> = ({ title, messages, status, error, composer }) => (
  <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
    <h1 className="text-2xl font-semibold">{title}</h1>
    {messages}
    {status}
    {error}
    {composer}
  </main>
);
