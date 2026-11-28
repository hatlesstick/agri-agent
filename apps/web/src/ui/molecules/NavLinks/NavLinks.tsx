"use client";

import type React from "react";
import { CalendarCheck, MessageSquare, Sprout, Sun, type LucideIcon } from "lucide-react";
import { Icon } from "@/ui/atoms/Icon";
import { usePathname } from "@/ui/hooks/usePathname";
import { useT } from "@/ui/hooks/useT";
import type { MessageKey } from "@/ui/i18n/uk";
import type { NavLinksProps } from "./NavLinks.types";

const ITEMS: Array<{ href: string; key: MessageKey; glyph: LucideIcon }> = [
  { href: "/", key: "nav.today", glyph: Sun },
  { href: "/fields", key: "nav.fields", glyph: Sprout },
  { href: "/approvals", key: "nav.approvals", glyph: CalendarCheck },
  { href: "/chat", key: "nav.chat", glyph: MessageSquare },
];

export const NavLinks: React.FC<NavLinksProps> = ({ variant }) => {
  const t = useT();
  const pathname = usePathname();
  const list = { sidebar: "flex flex-col gap-1", top: "grid grid-flow-col auto-cols-fr gap-1", tabs: "grid grid-cols-4 gap-1" }[variant];
  const link = variant === "tabs" ? "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-xs" : "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2";
  return (
    <ul className={list}>
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
        <li key={item.href}>
          <a
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${link} font-semibold text-ink focus-visible:outline-2 focus-visible:outline-sky ${active ? "bg-brand-wash" : "hover:bg-brand-wash"}`}
          >
            <Icon icon={item.glyph} />
            {t(item.key)}
          </a>
        </li>
        );
      })}
    </ul>
  );
};
