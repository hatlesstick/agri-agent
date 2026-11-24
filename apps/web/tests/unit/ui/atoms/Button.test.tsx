import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/ui/atoms/Button";

describe("Button", () => {
  it("calls its handler on click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Send</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is not clickable when disabled", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Send</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps touch targets at least 44 px tall", () => {
    render(<Button>Send</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-11");
  });

  it("merges a caller class without losing the variant classes", () => {
    render(<Button variant="quiet" className="w-full">Retry</Button>);
    const className = screen.getByRole("button").className;
    expect(className).toContain("w-full");
    expect(className).toContain("underline");
  });
});
