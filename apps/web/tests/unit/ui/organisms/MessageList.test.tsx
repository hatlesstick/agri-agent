import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MessageList } from "@/ui/organisms/MessageList";

describe("MessageList empty state", () => {
  it("offers ready questions as buttons that send them", async () => {
    const onSuggest = vi.fn();
    render(<MessageList messages={[]} lastIsComplete onSuggest={onSuggest} />);
    await userEvent.click(screen.getByRole("button", { name: "Чи можна обприскувати в Lyon завтра?" }));
    expect(onSuggest).toHaveBeenCalledWith("Чи можна обприскувати в Lyon завтра?");
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });
});
