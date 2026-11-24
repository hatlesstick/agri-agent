import { en } from "@/ui/i18n/en";
import { uk, type MessageKey } from "@/ui/i18n/uk";

export type Locale = "uk" | "en";

export const LOCALE_COOKIE = "agri-locale";
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_EVENT = "agri-locale-change";

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { uk, en };

const isLocale = (value: string | undefined): value is Locale => value === "uk" || value === "en";

export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function readLocale(cookieHeader: string | undefined): Locale {
  const pair = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  const value = pair?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function setLocaleCookie(locale: Locale): void {
  document.cookie = localeCookie(locale);
  window.dispatchEvent(new Event(LOCALE_EVENT));
}

export function translate(locale: Locale, key: MessageKey, vars: Record<string, string | number> = {}): string {
  const dictionary = DICTIONARIES[isLocale(locale) ? locale : DEFAULT_LOCALE];
  return dictionary[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}
