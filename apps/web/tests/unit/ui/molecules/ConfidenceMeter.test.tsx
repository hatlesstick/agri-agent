import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfidenceMeter } from "@/ui/molecules/ConfidenceMeter";

describe("ConfidenceMeter", () => {
  it("exposes the confidence as a labelled meter with a percentage", () => {
    render(<ConfidenceMeter value={0.72} />);
    const meter = screen.getByRole("meter", { name: "Впевненість" });
    expect(meter.getAttribute("aria-valuenow")).toBe("72");
    expect(screen.getByText("72%")).toBeTruthy();
  });

  it("clamps out-of-range values", () => {
    render(<ConfidenceMeter value={1.4} />);
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("100");
  });
});
