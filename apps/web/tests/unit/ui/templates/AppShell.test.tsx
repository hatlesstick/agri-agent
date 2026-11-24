import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/ui/templates/AppShell";

describe("AppShell", () => {
  it("renders three navigations: a sidebar for wide laptops, a top bar for narrow ones and tabs for phones", () => {
    render(<AppShell main={<p>Сьогодні</p>} chat={<p>Чат</p>} />);
    const navs = screen.getAllByRole("navigation", { name: "Навігація" });
    expect(navs).toHaveLength(3);
    expect(navs[0].className).toContain("xl:block");
    expect(navs[1].className).toContain("xl:hidden");
    expect(navs[2].className).toContain("md:hidden");
  });

  it("links the four core screens", () => {
    render(<AppShell main={<p>x</p>} chat={<p>y</p>} />);
    const links = screen.getAllByRole("link", { name: "Чат" });
    expect(links[0].getAttribute("href")).toBe("/chat");
    expect(screen.getAllByRole("link", { name: "Поля" })[0].getAttribute("href")).toBe("/fields");
    expect(screen.getAllByRole("link", { name: "Підтвердження" })[0].getAttribute("href")).toBe("/approvals");
  });

  it("puts the main content and the chat panel side by side on desktop", () => {
    render(<AppShell main={<p>основне</p>} chat={<p>панель</p>} />);
    expect(screen.getByText("основне")).toBeTruthy();
    expect(screen.getByText("панель")).toBeTruthy();
  });
});
