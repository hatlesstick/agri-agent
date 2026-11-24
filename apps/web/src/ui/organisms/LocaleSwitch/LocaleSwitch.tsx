"use client";

import type React from "react";
import { useLocale, useT } from "@/ui/hooks/useT";
import type { Locale } from "@/ui/helpers/i18n";

const OPTIONS: Array<{ locale: Locale; label: string }> = [
  { locale: "uk", label: "UA" },
  { locale: "en", label: "EN" },
];

export const LocaleSwitch: React.FC = () => {
  const [locale, setLocale] = useLocale();
  const t = useT();
  return (
    <div role="group" aria-label={t("locale.label")} className="inline-flex rounded-xl border border-rule p-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.locale}
          type="button"
          aria-pressed={locale === option.locale}
          onClick={() => setLocale(option.locale)}
          className={`min-h-11 min-w-11 rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-sky ${locale === option.locale ? "bg-ink text-paper" : "text-ink-soft hover:bg-brand-wash"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
