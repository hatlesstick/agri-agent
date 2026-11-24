import type React from "react";
import type { ChatTemplateProps } from "./ChatTemplate.types";

export const ChatTemplate: React.FC<ChatTemplateProps> = ({ title, account, messages, status, error, composer }) => (
  <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4 md:p-6">
    <h1 className="text-2xl font-semibold">{title}</h1>
    {account}
    {messages}
    {status}
    {error}
    {composer}
  </main>
);
