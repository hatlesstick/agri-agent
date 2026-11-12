import { describe, expect, it } from "vitest";
import type { AgriAgentUIMessage } from "@/agent";
import { assistantMessageView, stepLabel } from "@/ui/helpers/message-view";

function assistant(parts: unknown[]): AgriAgentUIMessage {
  return { id: "m1", role: "assistant", parts } as AgriAgentUIMessage;
}

const toolResult = { type: "tool-sprayWindow", toolCallId: "c1", state: "output-available", input: {}, output: {} };

describe("assistantMessageView", () => {
  it("shows the timeline only when a step used a tool", () => {
    expect(assistantMessageView(assistant([{ type: "step-start" }, { type: "text", text: "Hi" }]), true).showTimeline).toBe(false);
    expect(assistantMessageView(assistant([{ type: "step-start" }, toolResult]), true).showTimeline).toBe(true);
  });

  it("shows the empty-answer notice only for a finished message with a tool result and no text", () => {
    const toolOnly = assistant([{ type: "step-start" }, toolResult, { type: "text", text: "  " }]);

    expect(assistantMessageView(toolOnly, true).showEmptyNotice).toBe(true);
    expect(assistantMessageView(toolOnly, false).showEmptyNotice).toBe(false);
    expect(assistantMessageView(assistant([toolResult, { type: "text", text: "Yes" }]), true).showEmptyNotice).toBe(false);
  });
});

describe("stepLabel", () => {
  it("summarises tools with state marks", () => {
    expect(stepLabel({ step: 1, tools: [], wroteText: true })).toBe("answer");
    expect(
      stepLabel({
        step: 2,
        wroteText: false,
        tools: [
          { name: "getWeather", state: "output-available" },
          { name: "sprayWindow", state: "output-error" },
          { name: "searchDocs", state: "input-available" },
        ],
      }),
    ).toBe("getWeather ✓, sprayWindow ✗, searchDocs …");
  });
});
