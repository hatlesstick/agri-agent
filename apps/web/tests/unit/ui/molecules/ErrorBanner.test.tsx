import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBanner } from "@/ui/molecules/ErrorBanner";

describe("ErrorBanner", () => {
  it("shows the message as an alert and retries on click", async () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="The AI service is busy" onRetry={onRetry} />);

    expect(screen.getByRole("alert").textContent).toContain("The AI service is busy");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
