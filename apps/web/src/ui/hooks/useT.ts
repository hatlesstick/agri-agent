"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, LOCALE_EVENT, readLocale, setLocaleCookie, translate, type Locale } from "@/ui/helpers/i18n";
import type { MessageKey } from "@/ui/i18n/uk";

const subscribe = (onChange: () => void) => {
  window.addEventListener(LOCALE_EVENT, onChange);
  return () => window.removeEventListener(LOCALE_EVENT, onChange);
};
const currentLocale = (): Locale => readLocale(document.cookie);
const serverLocale = (): Locale => DEFAULT_LOCALE;

export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, currentLocale, serverLocale);
  const setLocale = useCallback((next: Locale) => setLocaleCookie(next), []);
  return [locale, setLocale];
}

export function useT(): (key: MessageKey, vars?: Record<string, string | number>) => string {
  const [locale] = useLocale();
  return useCallback((key, vars) => translate(locale, key, vars), [locale]);
}
