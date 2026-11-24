import { describe, expect, it } from "vitest";
import { readTheme, themeCookie } from "@/ui/helpers/theme";

describe("theme helpers", () => {
  it("defaults to the system theme and reads the saved choice", () => {
    expect(readTheme(undefined)).toBe("system");
    expect(readTheme("agri-theme=dark")).toBe("dark");
    expect(readTheme("agri-theme=light; agri-locale=en")).toBe("light");
    expect(readTheme("agri-theme=blue")).toBe("system");
  });

  it("writes a one-year cookie with the chosen theme", () => {
    expect(themeCookie("light")).toContain("agri-theme=light");
    expect(themeCookie("light")).toContain("Max-Age=31536000");
  });
});
