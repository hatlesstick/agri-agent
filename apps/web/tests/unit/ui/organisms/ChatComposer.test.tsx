import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatComposer } from "@/ui/organisms/ChatComposer";
import { CHAT_LIMITS } from "@/shared/config/chat-limits";

function setup(isBusy = false) {
  const onSend = vi.fn();
  const onStop = vi.fn();
  render(<ChatComposer isBusy={isBusy} onSend={onSend} onStop={onStop} />);
  return { onSend, onStop, input: screen.getByRole("textbox", { name: "Message" }) as HTMLInputElement };
}

describe("ChatComposer", () => {
  it("keeps Send disabled until there is text", async () => {
    const { input } = setup();
    const send = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    await userEvent.type(input, "   ");
    expect(send.disabled).toBe(true);

    await userEvent.type(input, "Can I spray in Lyon?");
    await waitFor(() => expect(send.disabled).toBe(false));
  });

  it("sends trimmed text and clears the field", async () => {
    const { onSend, input } = setup();

    await userEvent.type(input, "  Can I spray in Lyon tomorrow?  {enter}");

    await waitFor(() => expect(onSend).toHaveBeenCalledWith("Can I spray in Lyon tomorrow?"));
    expect(input.value).toBe("");
  });

  it("shows a validation error for messages over the server limit", async () => {
    const { onSend, input } = setup();

    await userEvent.click(input);
    await userEvent.paste("a".repeat(CHAT_LIMITS.maxMessageChars + 1));

    expect(await screen.findByText(`Keep it under ${CHAT_LIMITS.maxMessageChars} characters`)).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("offers Stop instead of Send while the agent is busy", async () => {
    const { onStop, input } = setup(true);

    expect(input.disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));

    expect(onStop).toHaveBeenCalledOnce();
  });
});
