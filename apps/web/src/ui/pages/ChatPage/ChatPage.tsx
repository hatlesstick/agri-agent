"use client";

import type React from "react";
import { AccountPanel } from "@/ui/organisms/AccountPanel";
import { ChatPanel } from "@/ui/organisms/ChatPanel";
import { useT } from "@/ui/hooks/useT";
import { AppShell } from "@/ui/templates/AppShell";

export const ChatPage: React.FC = () => {
  const t = useT();
  return (
    <AppShell
      account={<AccountPanel />}
      main={
        <section className="mx-auto flex h-[calc(100dvh-10rem)] min-h-[420px] w-full max-w-3xl flex-col gap-3 md:h-[calc(100dvh-8rem)]">
          <h1 className="font-display text-3xl font-bold">{t("app.name")}</h1>
          <ChatPanel />
        </section>
      }
      chat={null}
    />
  );
};
