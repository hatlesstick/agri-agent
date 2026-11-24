import { describe, expect, it } from "vitest";
import { en } from "@/ui/i18n/en";
import { uk } from "@/ui/i18n/uk";
import { LOCALE_COOKIE, localeCookie, readLocale, translate } from "@/ui/helpers/i18n";

describe("message dictionaries", () => {
  it("English has every Ukrainian key, with non-empty text", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(uk).sort());
    for (const key of Object.keys(uk) as Array<keyof typeof uk>) {
      expect(en[key].trim().length).toBeGreaterThan(0);
      expect(uk[key].trim().length).toBeGreaterThan(0);
    }
  });

  it("interpolates named variables", () => {
    expect(translate("en", "window.range", { start: "06:00", end: "10:00" })).toBe("06:00–10:00");
    expect(translate("uk", "window.range", { start: "06:00", end: "10:00" })).toBe("06:00–10:00");
  });

  it("falls back to Ukrainian, the default locale, for an unknown locale value", () => {
    expect(translate("fr" as never, "nav.today")).toBe(uk["nav.today"]);
  });
});

describe("locale cookie", () => {
  it("round-trips the locale through the cookie header", () => {
    expect(localeCookie("en")).toContain(`${LOCALE_COOKIE}=en`);
    expect(readLocale(`theme=dark; ${LOCALE_COOKIE}=en`)).toBe("en");
    expect(readLocale(undefined)).toBe("uk");
    expect(readLocale(`${LOCALE_COOKIE}=xx`)).toBe("uk");
  });
});
