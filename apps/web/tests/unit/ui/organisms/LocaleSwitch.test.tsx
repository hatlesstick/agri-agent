import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LocaleSwitch } from "@/ui/organisms/LocaleSwitch";

describe("LocaleSwitch", () => {
  it("switches the interface language and remembers the choice", async () => {
    render(<LocaleSwitch />);
    expect(screen.getByRole("button", { name: "UA" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(screen.getByRole("button", { name: "EN" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.cookie).toContain("agri-locale=en");
  });
});
