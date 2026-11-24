import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/ui/templates/AppShell";

describe("AppShell", () => {
  it("renders three navigations: a sidebar for wide laptops, a top bar for narrow ones and tabs for phones", () => {
    render(<AppShell main={<p>Сьогодні</p>} chat={<p>Чат</p>} />);
    const navs = screen.getAllByRole("navigation", { name: "Навігація" });
    expect(navs).toHaveLength(3);
    expect(navs.some((nav) => nav.className.includes("xl:block"))).toBe(true);
    expect(navs.some((nav) => nav.className.includes("md:block xl:hidden"))).toBe(true);
    expect(navs.some((nav) => nav.className.includes("md:hidden"))).toBe(true);
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

  it("lets the chat column be hidden and shown again", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    render(<AppShell main={<p>основне</p>} chat={<p>панель</p>} />);
    const toggle = screen.getByRole("button", { name: "Сховати чат" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Показати чат" }).getAttribute("aria-expanded")).toBe("false");
  });
});
