import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TodayForecast } from "@/ui/organisms/TodayForecast";
import { FORECAST_STORAGE_KEY } from "@/ui/helpers/forecast-memory";

describe("TodayForecast", () => {
  afterEach(() => window.localStorage.clear());

  it("renders nothing when no forecast was asked yet", () => {
    const { container } = render(<TodayForecast />);
    expect(container.querySelector("section")).toBeNull();
  });

  it("shows the hour strip for the last forecast saved by the chat", () => {
    window.localStorage.setItem(FORECAST_STORAGE_KEY, JSON.stringify({ city: "Луцьк", date: "2026-11-12", windows: [{ from: "2026-11-12T08:00", to: "2026-11-12T09:00" }], hourly: [{ time: "2026-11-12T09:00", windSpeed: 3.1, precipitation: 0.2 }] }));
    render(<TodayForecast />);
    expect(screen.getAllByRole("button")).toHaveLength(17);
    expect(screen.getByText(/Прогноз для Луцьк · 2026-11-12/)).toBeTruthy();
  });
});
