import { describe, expect, it } from "vitest";
import { sprayDecision } from "@/ui/helpers/spray-decision";
import type { ToolPart } from "@/ui/helpers/tool-parts";

const output = {
  city: "Lutsk",
  date: "2026-11-13",
  timezone: "Europe/Kyiv",
  canSpray: true,
  bestWindow: { from: "2026-11-13T09:00", to: "2026-11-13T10:00", hours: 2 },
  windows: [{ from: "2026-11-13T09:00", to: "2026-11-13T10:00", hours: 2 }],
  rejectedReasons: {},
};

const part = (state: string, value: unknown, type = "tool-sprayWindow") => ({ type, state, output: value }) as unknown as ToolPart;

describe("sprayDecision", () => {
  it("turns a finished spray window answer into a verdict, its time range and 17 hours", () => {
    const decision = sprayDecision(part("output-available", output));
    expect(decision?.status).toBe("go");
    expect(decision?.range).toBe("09:00–10:00");
    expect(decision?.hours).toHaveLength(17);
    expect(decision?.hours.find((hour) => hour.time === "09:00")?.status).toBe("go");
  });

  it("reports a stop verdict when spraying is not possible", () => {
    expect(sprayDecision(part("output-available", { ...output, canSpray: false, bestWindow: null, windows: [] }))?.status).toBe("stop");
  });

  it("returns nothing for other tools, unfinished calls and errors", () => {
    expect(sprayDecision(part("output-available", output, "tool-getWeather"))).toBeNull();
    expect(sprayDecision(part("input-available", undefined))).toBeNull();
    expect(sprayDecision(part("output-available", { error: "city_not_found" }))).toBeNull();
  });
});
