"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, readLocale, translate, type Locale } from "@/ui/helpers/i18n";
import type { MessageKey } from "@/ui/i18n/uk";

const subscribe = () => () => undefined;
const currentLocale = (): Locale => readLocale(document.cookie);
const serverLocale = (): Locale => DEFAULT_LOCALE;

export function useT(): (key: MessageKey, vars?: Record<string, string | number>) => string {
  const locale = useSyncExternalStore(subscribe, currentLocale, serverLocale);
  return useCallback((key, vars) => translate(locale, key, vars), [locale]);
}
