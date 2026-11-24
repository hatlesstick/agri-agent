import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu } from "@/ui/molecules/AccountMenu";

const anonymous = { userId: "11111111-1111-4111-8111-111111111111", displayName: null, avatarUrl: null, providers: ["web" as const], signedIn: false };
const signedIn = { userId: "11111111-1111-4111-8111-111111111111", displayName: "Ann", avatarUrl: "https://a.example/42", providers: ["web" as const, "github" as const], signedIn: true };

describe("AccountMenu", () => {
  it("offers only the configured providers to an anonymous visitor", () => {
    render(<AccountMenu me={anonymous} providers={["github"]} returnTo="/chat" authError={undefined} onSignOut={() => {}} />);
    const link = screen.getByRole("link", { name: "Sign in with GitHub" });
    expect(link.getAttribute("href")).toBe("/api/auth/github/start?returnTo=%2Fchat");
    expect(screen.queryByRole("link", { name: "Sign in with Google" })).toBeNull();
  });

  it("shows the name, avatar and a sign-out button to a signed-in user", async () => {
    const onSignOut = vi.fn();
    render(<AccountMenu me={signedIn} providers={["github", "google"]} returnTo="/" authError={undefined} onSignOut={onSignOut} />);
    expect(screen.getByText("Ann")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Sign in/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("announces a sign-in failure", () => {
    render(<AccountMenu me={anonymous} providers={["github"]} returnTo="/" authError="Sign-in was cancelled." onSignOut={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain("Sign-in was cancelled.");
  });
});
