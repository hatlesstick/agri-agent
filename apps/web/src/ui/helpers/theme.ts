export type Theme = "system" | "light" | "dark";

export const THEME_COOKIE = "agri-theme";

export function readTheme(cookieHeader: string | undefined): Theme {
  const pair = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${THEME_COOKIE}=`));
  const value = pair?.slice(THEME_COOKIE.length + 1);
  return value === "light" || value === "dark" ? value : "system";
}

export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function applyTheme(theme: Theme): void {
  document.cookie = themeCookie(theme);
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}
