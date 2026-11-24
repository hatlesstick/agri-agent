import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NavLinks } from "@/ui/molecules/NavLinks";

describe("NavLinks", () => {
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("marks the current screen with aria-current", () => {
    window.history.replaceState({}, "", "/fields");
    render(<NavLinks variant="sidebar" />);
    expect(screen.getByRole("link", { name: "Поля" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Сьогодні" }).getAttribute("aria-current")).toBeNull();
  });

  it("does not mark Today as current on other screens", () => {
    window.history.replaceState({}, "", "/chat");
    render(<NavLinks variant="sidebar" />);
    expect(screen.getByRole("link", { name: "Чат" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Сьогодні" }).getAttribute("aria-current")).toBeNull();
  });
});
