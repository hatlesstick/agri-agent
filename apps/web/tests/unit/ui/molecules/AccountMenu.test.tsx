import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu } from "@/ui/molecules/AccountMenu";

const guest = { userId: "11111111-1111-4111-8111-111111111111", displayName: null, avatarUrl: null, providers: ["web" as const], signedIn: false };
const member = { userId: "11111111-1111-4111-8111-111111111111", displayName: "Ann", avatarUrl: "https://a.example/42", providers: ["web" as const, "github" as const], signedIn: true };

const base = { returnTo: "/chat", authError: undefined, onToggle: () => {}, onSignOut: () => {} };

describe("AccountMenu", () => {
  it("explains when sign-in is not set up instead of opening an empty menu", () => {
    render(<AccountMenu {...base} me={guest} providers={[]} menuOpen onToggle={() => {}} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Вхід на цьому сервері не налаштовано.")).toBeTruthy();
  });

  it("tells a guest why signing in helps before the provider buttons", () => {
    render(<AccountMenu {...base} me={guest} providers={["github"]} menuOpen onToggle={() => {}} />);
    expect(screen.getByText("Увійти, щоб зберегти історію")).toBeTruthy();
    expect(screen.getByText("Історія і прогнози залишаться з вами після входу.")).toBeTruthy();
  });

  it("is closed by default and opens from the avatar button", async () => {
    const onToggle = vi.fn();
    render(<AccountMenu {...base} me={guest} providers={["github"]} menuOpen={false} onToggle={onToggle} />);
    expect(screen.queryByRole("menu")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Акаунт" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("offers only the configured providers to a guest", () => {
    render(<AccountMenu {...base} me={guest} providers={["github"]} menuOpen onToggle={() => {}} />);
    expect(screen.getByRole("link", { name: "Увійти через GitHub" }).getAttribute("href")).toBe("/api/auth/github/start?returnTo=%2Fchat");
    expect(screen.queryByRole("link", { name: /Google/ })).toBeNull();
  });

  it("shows the avatar and the name, and signs out from the menu", async () => {
    const onSignOut = vi.fn();
    render(<AccountMenu {...base} me={member} providers={["github", "google"]} menuOpen onSignOut={onSignOut} onToggle={() => {}} />);
    expect(document.querySelector("img")?.getAttribute("src")).toBe("https://a.example/42");
    expect(screen.getByText("Ann")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Вийти" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("announces a sign-in failure", () => {
    render(<AccountMenu {...base} me={guest} providers={["github"]} menuOpen={false} authError="Sign-in was cancelled." />);
    expect(screen.getByRole("alert").textContent).toContain("Sign-in was cancelled.");
  });

  it("keeps language and theme settings in the account menu", () => {
    render(<AccountMenu {...base} me={guest} providers={[]} menuOpen onToggle={() => {}} settings={<p>налаштування</p>} />);
    expect(screen.getByText("Налаштування")).toBeTruthy();
    expect(screen.getByText("налаштування")).toBeTruthy();
  });
});
