import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ToolPart } from "@/ui/helpers/tool-parts";
import { ToolCallCard } from "@/ui/organisms/ToolCallCard";

const sprayWindowPart = {
  type: "tool-sprayWindow",
  toolCallId: "call-1",
  state: "output-available",
  input: { city: "Lyon", date: "tomorrow" },
  output: {
    city: "Lyon",
    date: "2026-11-13",
    timezone: "Europe/Paris",
    canSpray: true,
    bestWindow: { from: "2026-11-13T09:00", to: "2026-11-13T13:00", hours: 4 },
    windows: [{ from: "2026-11-13T09:00", to: "2026-11-13T13:00", hours: 4 }],
    rejectedReasons: { wind_too_high: 5, precipitation_nearby: 2 },
  },
} as unknown as ToolPart;

describe("ToolCallCard", () => {
  it("shows the tool, its input and the spray decision", () => {
    render(<ToolCallCard part={sprayWindowPart} />);

    expect(screen.getByText("🔧 sprayWindow")).toBeTruthy();
    expect(screen.getByText("done")).toBeTruthy();
    expect(screen.getByText('"Lyon"')).toBeTruthy();
    expect(screen.getByText(/Spraying possible · Lyon, 2026-11-13/)).toBeTruthy();
    expect(screen.getByText(/Best window: 2026-11-13 09:00 → 2026-11-13 13:00 \(4 h/)).toBeTruthy();
    expect(screen.getByText("Rejected hours: wind too strong (5 h), rain nearby (2 h)")).toBeTruthy();
  });

  it("shows tool errors returned as data", () => {
    render(<ToolCallCard part={{ ...sprayWindowPart, output: { error: "city_not_found" } } as unknown as ToolPart} />);

    expect(screen.getByText("⚠️ city not found")).toBeTruthy();
  });

  it("marks failed calls", () => {
    render(<ToolCallCard part={{ ...sprayWindowPart, state: "output-error", output: undefined, errorText: "Gateway timeout" } as unknown as ToolPart} />);

    expect(screen.getByText("failed")).toBeTruthy();
    expect(screen.getByText("Gateway timeout")).toBeTruthy();
  });
});
