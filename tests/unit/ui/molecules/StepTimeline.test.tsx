import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepTimeline } from "@/ui/molecules/StepTimeline";

describe("StepTimeline", () => {
  it("labels each step with its tools and their state", () => {
    render(
      <StepTimeline
        steps={[
          { step: 1, tools: [{ name: "sprayWindow", state: "output-available" }], wroteText: false },
          { step: 2, tools: [], wroteText: true },
        ]}
      />,
    );

    const items = within(screen.getByRole("list", { name: "Agent steps" })).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Step 1 · sprayWindow ✓", "→Step 2 · answer"]);
  });
});
