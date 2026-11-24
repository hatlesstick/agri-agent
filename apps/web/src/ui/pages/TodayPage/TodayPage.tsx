"use client";

import type React from "react";
import { AppShell } from "@/ui/templates/AppShell";
import { AccountPanel } from "@/ui/organisms/AccountPanel";
import { ChatPanel } from "@/ui/organisms/ChatPanel";
import { TodayForecast } from "@/ui/organisms/TodayForecast";
import { useT } from "@/ui/hooks/useT";

export const TodayPage: React.FC = () => {
  const t = useT();
  return (
    <AppShell
      main={
        <section className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold">{t("today.title")}</h1>
          <p className="text-ink-soft">{t("today.invite")}</p>
          <TodayForecast />
        </section>
      }
      account={<AccountPanel />}
      chat={<ChatPanel />}
    />
  );
};
