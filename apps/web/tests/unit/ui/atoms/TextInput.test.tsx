import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextInput } from "@/ui/atoms/TextInput";

describe("TextInput", () => {
  it("uses the ink and rule tokens for its border and focus, never the default blue", () => {
    render(<TextInput aria-label="Message" />);
    const className = screen.getByRole("textbox", { name: "Message" }).className;
    expect(className).toContain("border-rule");
    expect(className).toContain("focus-visible:outline-ink");
    expect(className).not.toContain("sky");
    expect(className).not.toContain("blue");
  });
});
