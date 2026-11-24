"use client";

import type React from "react";
import { NavLinks } from "@/ui/molecules/NavLinks";
import { useT } from "@/ui/hooks/useT";
import type { AppShellProps } from "./AppShell.types";

export const AppShell: React.FC<AppShellProps> = ({ main, chat }) => {
  const t = useT();
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4 md:flex-row md:p-6">
      <nav aria-label={t("nav.label")} className="hidden w-48 shrink-0 md:block">
        <NavLinks variant="sidebar" />
      </nav>
      <main className="flex min-w-0 flex-1 flex-col gap-4 pb-24 md:pb-0">{main}</main>
      <aside className="flex min-w-0 flex-col gap-4 md:w-96 md:shrink-0">{chat}</aside>
      <nav aria-label={t("nav.label")} className="fixed inset-x-0 bottom-0 border-t border-rule bg-paper p-2 md:hidden">
        <NavLinks variant="tabs" />
      </nav>
    </div>
  );
};
