import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HourStrip } from "@/ui/organisms/HourStrip";
import type { HourView } from "@/ui/helpers/hour-strip";

const hours: HourView[] = Array.from({ length: 17 }, (_, index) => {
  const hour = String(5 + index).padStart(2, "0");
  return { time: `${hour}:00`, status: index >= 3 && index <= 5 ? "go" : "stop", windMs: 2 + index / 10, precipMm: 0 };
});

describe("HourStrip", () => {
  it("renders one selectable bar per hour", () => {
    render(<HourStrip hours={hours} />);
    expect(screen.getAllByRole("button")).toHaveLength(17);
  });

  it("shows the selected hour's detail when another hour is chosen", async () => {
    render(<HourStrip hours={hours} />);
    await userEvent.click(screen.getByRole("button", { name: /08:00/ }));
    expect(screen.getByRole("button", { name: /08:00/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("08:00 · вітер 2.3 м/с")).toBeTruthy();
  });

  it("gives a headline with the number of spray hours", () => {
    render(<HourStrip hours={hours} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("3");
  });
});
