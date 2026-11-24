"use client";

import type React from "react";
import { usePathname } from "@/ui/hooks/usePathname";
import { useT } from "@/ui/hooks/useT";
import type { MessageKey } from "@/ui/i18n/uk";
import type { NavLinksProps } from "./NavLinks.types";

const ITEMS: Array<{ href: string; key: MessageKey }> = [
  { href: "/", key: "nav.today" },
  { href: "/fields", key: "nav.fields" },
  { href: "/approvals", key: "nav.approvals" },
  { href: "/chat", key: "nav.chat" },
];

export const NavLinks: React.FC<NavLinksProps> = ({ variant }) => {
  const t = useT();
  const pathname = usePathname();
  const list = { sidebar: "flex flex-col gap-1", top: "flex flex-wrap gap-1", tabs: "grid grid-cols-4 gap-1" }[variant];
  const link = variant === "tabs" ? "flex min-h-11 flex-col items-center justify-center rounded-xl text-xs" : "inline-flex min-h-11 items-center rounded-xl px-3 py-2";
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
            {t(item.key)}
          </a>
        </li>
        );
      })}
    </ul>
  );
};
