import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatScroller } from "@/ui/molecules/ChatScroller";

describe("ChatScroller", () => {
  it("scrolls its content inside a bounded area instead of growing the page", () => {
    render(
      <ChatScroller watch={[1]}>
        <p>сповіщення</p>
      </ChatScroller>,
    );
    const area = screen.getByText("сповіщення").parentElement;
    expect(area?.className).toContain("overflow-y-auto");
    expect(area?.className).toContain("min-h-0");
    expect(area?.className).toContain("flex-1");
  });
});
