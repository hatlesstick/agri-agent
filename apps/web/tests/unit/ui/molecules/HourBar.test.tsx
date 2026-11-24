import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HourBar } from "@/ui/molecules/HourBar";

describe("HourBar", () => {
  it("shows the hour, the verdict word, wind and precipitation", () => {
    render(<HourBar time="06:00" status="go" windMs={2.4} precipMm={0} selected={false} onSelect={() => {}} />);
    const button = screen.getByRole("button", { name: /06:00/ });
    expect(button.textContent).toContain("Можна обприскувати");
    expect(button.textContent).toContain("2.4");
    expect(button.textContent).toContain("0");
  });

  it("reports its selected state and selects on click", async () => {
    const onSelect = vi.fn();
    render(<HourBar time="07:00" status="caution" windMs={3.9} precipMm={0.2} selected onSelect={onSelect} />);
    const button = screen.getByRole("button", { name: /07:00/ });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("is reachable and selectable from the keyboard", async () => {
    const onSelect = vi.fn();
    render(<HourBar time="08:00" status="stop" windMs={6} precipMm={1} selected={false} onSelect={onSelect} />);
    screen.getByRole("button", { name: /08:00/ }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
