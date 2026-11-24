import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircleCheck } from "lucide-react";
import { Icon } from "@/ui/atoms/Icon";

describe("Icon", () => {
  it("is decorative by default and sized to 18 px", () => {
    const { container } = render(<Icon icon={CircleCheck} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("width")).toBe("18");
  });

  it("is announced when given a label", () => {
    const { getByRole } = render(<Icon icon={CircleCheck} label="Можна" />);
    expect(getByRole("img", { name: "Можна" })).toBeTruthy();
  });
});
