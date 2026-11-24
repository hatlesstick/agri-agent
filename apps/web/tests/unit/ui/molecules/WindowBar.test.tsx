import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WindowBar } from "@/ui/molecules/WindowBar";
import type { HourView } from "@/ui/helpers/hour-strip";

const hours: HourView[] = [
  { time: "09:00", status: "go", windMs: null, precipMm: null },
  { time: "10:00", status: "stop", windMs: null, precipMm: null },
];

describe("WindowBar", () => {
  it("summarises the hours as one labelled image", () => {
    render(<WindowBar hours={hours} />);
    expect(screen.getByRole("img", { name: "1 годин можна обприскувати" })).toBeTruthy();
  });
});
