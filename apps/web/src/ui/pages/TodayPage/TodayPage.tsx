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
      account={<AccountPanel />}
      main={
        <>
          <section className="flex flex-col gap-5 rounded-[28px] bg-brand p-6 text-brand-ink md:p-8">
            <h1 className="font-display text-3xl font-bold md:text-4xl">{t("today.title")}</h1>
            <p className="max-w-prose text-base leading-relaxed">{t("today.invite")}</p>
            <ul className="flex flex-col gap-2 text-sm">
              <li>“{t("today.example.1")}”</li>
              <li>“{t("today.example.2")}”</li>
            </ul>
            <a href="/chat" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-ink px-4 font-semibold text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky">
              {t("today.ask")}
            </a>
          </section>
          <TodayForecast />
        </>
      }
      chat={<ChatPanel />}
    />
  );
};
