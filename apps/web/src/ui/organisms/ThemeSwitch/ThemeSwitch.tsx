"use client";

import type React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Icon } from "@/ui/atoms/Icon";
import { applyTheme, readTheme, type Theme } from "@/ui/helpers/theme";
import { useT } from "@/ui/hooks/useT";
import { useSyncExternalStore } from "react";
import type { MessageKey } from "@/ui/i18n/uk";

const OPTIONS: Array<{ theme: Theme; key: MessageKey; glyph: typeof Sun }> = [
  { theme: "system", key: "theme.system", glyph: Monitor },
  { theme: "light", key: "theme.light", glyph: Sun },
  { theme: "dark", key: "theme.dark", glyph: Moon },
];

const subscribe = (onChange: () => void) => {
  window.addEventListener("agri-theme-change", onChange);
  return () => window.removeEventListener("agri-theme-change", onChange);
};
const current = (): Theme => readTheme(document.cookie);
const serverTheme = (): Theme => "system";

export const ThemeSwitch: React.FC = () => {
  const t = useT();
  const theme = useSyncExternalStore(subscribe, current, serverTheme);
  return (
    <div role="group" aria-label={t("theme.label")} className="inline-flex rounded-xl border border-rule p-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.theme}
          type="button"
          aria-pressed={theme === option.theme}
          aria-label={t(option.key)}
          title={t(option.key)}
          onClick={() => {
            applyTheme(option.theme);
            window.dispatchEvent(new Event("agri-theme-change"));
          }}
          className={`grid min-h-11 min-w-11 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-sky ${theme === option.theme ? "bg-ink text-paper" : "text-ink-soft hover:bg-brand-wash"}`}
        >
          <Icon icon={option.glyph} size={18} />
        </button>
      ))}
    </div>
  );
};
