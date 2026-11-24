"use client";

import type React from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Icon } from "@/ui/atoms/Icon";
import { BrandMark } from "@/ui/molecules/BrandMark";
import { NavLinks } from "@/ui/molecules/NavLinks";
import { useChatOpen } from "@/ui/hooks/useChatOpen";
import { useT } from "@/ui/hooks/useT";
import type { AppShellProps } from "./AppShell.types";

const CHAT_WIDTH = "md:w-[360px] xl:w-[clamp(320px,28vw,420px)]";

export const AppShell: React.FC<AppShellProps> = ({ main, chat, account }) => {
  const t = useT();
  const { open, toggle } = useChatOpen();
  const hasChat = chat !== null && chat !== undefined;
  return (
    <div className="flex min-h-screen flex-col gap-6 p-4 md:p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <BrandMark />
          <nav aria-label={t("nav.label")} className="hidden md:block xl:hidden">
            <NavLinks variant="top" />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {hasChat && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls="chat-panel"
              onClick={toggle}
              className="hidden min-h-11 items-center gap-2 rounded-xl border border-rule px-3 text-sm font-semibold text-ink hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-sky md:inline-flex"
            >
              <Icon icon={open ? PanelRightClose : PanelRightOpen} />
              {t(open ? "chat.hide" : "chat.show")}
            </button>
          )}
          {account}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 xl:flex-row">
        <nav aria-label={t("nav.label")} className="hidden xl:block xl:w-[200px] xl:shrink-0">
          <NavLinks variant="sidebar" />
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-4 pb-24 md:pb-0">{main}</main>

        {hasChat && (
          <aside
            id="chat-panel"
            aria-hidden={!open}
            className={`hidden min-w-0 shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-out motion-reduce:transition-none md:flex md:flex-col xl:sticky xl:top-6 xl:h-[calc(100dvh-7rem)] ${open ? `${CHAT_WIDTH} opacity-100` : "pointer-events-none opacity-0 md:w-0 xl:w-0"}`}
          >
            <div className={`flex h-full min-h-0 flex-1 flex-col ${CHAT_WIDTH}`}>{chat}</div>
          </aside>
        )}
      </div>

      <nav aria-label={t("nav.label")} className="fixed inset-x-0 bottom-0 border-t border-rule bg-paper p-2 md:hidden">
        <NavLinks variant="tabs" />
      </nav>
    </div>
  );
};
