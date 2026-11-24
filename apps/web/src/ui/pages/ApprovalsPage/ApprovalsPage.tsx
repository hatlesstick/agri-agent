"use client";

import type React from "react";
import { AppShell } from "@/ui/templates/AppShell";
import { ChatPanel } from "@/ui/organisms/ChatPanel";
import { useT } from "@/ui/hooks/useT";

export const ApprovalsPage: React.FC = () => {
  const t = useT();
  return (
    <AppShell
      main={
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-3xl font-bold">{t("approvals.title")}</h1>
          <div className="rounded-[20px] border border-dashed border-rule p-6">
            <h2 className="font-display text-lg font-bold">{t("approvals.empty.title")}</h2>
            <p className="mt-2 text-ink-soft">{t("approvals.empty.body")}</p>
          </div>
        </section>
      }
      chat={<ChatPanel />}
    />
  );
};
