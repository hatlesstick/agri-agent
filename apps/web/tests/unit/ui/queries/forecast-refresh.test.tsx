import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AgriChatMessage } from "@agri/shared/contracts";
import { ForecastSaver } from "@/ui/organisms/ForecastSaver";
import { TodayForecast } from "@/ui/organisms/TodayForecast";
import { QueryProvider } from "@/ui/organisms/QueryProvider";

const sprayWindow = (city: string) => ({
  type: "tool-sprayWindow",
  state: "output-available",
  output: { city, date: "2026-11-12", timezone: "Europe/Kyiv", canSpray: true, bestWindow: { from: "2026-11-12T08:00", to: "2026-11-12T09:00", hours: 2 }, windows: [{ from: "2026-11-12T08:00", to: "2026-11-12T09:00", hours: 2 }], rejectedReasons: {} },
});

const getWeather = (city: string) => ({
  type: "tool-getWeather",
  state: "output-available",
  output: {
    city,
    country: "Poland",
    region: null,
    latitude: 51.7,
    longitude: 19.4,
    timezone: "Europe/Kyiv",
    hourly: [{ time: "2026-11-12T08:00", temperature: 5, windSpeed: 2.5, precipitation: 0, precipitationProbability: 0, humidity: 70 }],
  },
});

const answer = (city: string): AgriChatMessage => ({ id: `m-${city}`, role: "assistant", parts: [sprayWindow(city), getWeather(city)] }) as never;

describe("today's forecast refreshes after a chat answer without a reload", () => {
  afterEach(() => window.localStorage.clear());

  it("shows the new city on the home card as soon as the chat answer arrives", async () => {
    const { rerender } = render(
      <QueryProvider>
        <ForecastSaver messages={[]} />
        <TodayForecast />
      </QueryProvider>,
    );
    expect(screen.queryByText(/Прогноз для/)).toBeNull();

    rerender(
      <QueryProvider>
        <ForecastSaver messages={[answer("Лодзь")]} />
        <TodayForecast />
      </QueryProvider>,
    );

    expect(await screen.findByText(/Прогноз для Лодзь/)).toBeTruthy();
  });
});
