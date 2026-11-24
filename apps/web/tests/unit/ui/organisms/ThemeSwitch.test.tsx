import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeSwitch } from "@/ui/organisms/ThemeSwitch";

describe("ThemeSwitch", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("applies the chosen theme to the page and remembers it", async () => {
    render(<ThemeSwitch />);
    expect(screen.getByRole("button", { name: "Системна" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "Світла" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Світла" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.cookie).toContain("agri-theme=light");
    await userEvent.click(screen.getByRole("button", { name: "Системна" }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
