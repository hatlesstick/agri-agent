import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProviderIcon } from "@/ui/atoms/ProviderIcon";

describe("ProviderIcon", () => {
  it("renders the GitHub mark decoratively, filled with the current text colour", () => {
    const { container } = render(<ProviderIcon provider="github" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.querySelector("path")?.getAttribute("fill")).toBe("currentColor");
  });

  it("renders a different mark for Google", () => {
    const github = render(<ProviderIcon provider="github" />).container.innerHTML;
    const google = render(<ProviderIcon provider="google" />).container.innerHTML;
    expect(google).not.toBe(github);
  });
});
