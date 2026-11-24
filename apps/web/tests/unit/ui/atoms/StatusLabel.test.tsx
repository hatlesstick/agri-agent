import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusLabel } from "@/ui/atoms/StatusLabel";
import { uk } from "@/ui/i18n/uk";

describe("StatusLabel", () => {
  it.each([
    ["go", uk["status.go"]],
    ["caution", uk["status.caution"]],
    ["stop", uk["status.stop"]],
  ] as const)("shows the %s verdict as a word next to an icon", (status, word) => {
    const { container } = render(<StatusLabel status={status} />);
    expect(screen.getByText(word)).toBeTruthy();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
