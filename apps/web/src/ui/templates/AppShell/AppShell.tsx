"use client";

import type React from "react";
import { NavLinks } from "@/ui/molecules/NavLinks";
import { useT } from "@/ui/hooks/useT";
import type { AppShellProps } from "./AppShell.types";

export const AppShell: React.FC<AppShellProps> = ({ main, chat, account }) => {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 md:p-6 xl:grid xl:grid-cols-[200px_minmax(0,1fr)_clamp(320px,28vw,420px)] xl:items-start xl:gap-6">
      <nav aria-label={t("nav.label")} className="hidden xl:sticky xl:top-6 xl:block">
        <NavLinks variant="sidebar" />
      </nav>
      <nav aria-label={t("nav.label")} className="hidden md:block xl:hidden">
        <NavLinks variant="top" />
      </nav>
      <main className="flex min-w-0 flex-1 flex-col gap-4 pb-24 md:pb-0">
        {account}
        {main}
      </main>
      {chat && (
        <aside className="hidden min-w-0 flex-col md:flex xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
          <details open className="flex min-h-0 flex-1 flex-col">
            <summary className="cursor-pointer py-2 font-semibold">{t("chat.title")}</summary>
            <div className="flex min-h-0 flex-1 flex-col">{chat}</div>
          </details>
        </aside>
      )}
      <nav aria-label={t("nav.label")} className="fixed inset-x-0 bottom-0 border-t border-rule bg-paper p-2 md:hidden">
        <NavLinks variant="tabs" />
      </nav>
    </div>
  );
};
