import { describe, expect, it } from "vitest";
import type { AgriAgentUIMessage } from "@/agent";
import { currentActivity, summarizeSteps } from "@/ui/helpers/agent-activity";

type Part = AgriAgentUIMessage["parts"][number];

function assistant(parts: unknown[]): AgriAgentUIMessage {
  return { id: "a", role: "assistant", parts: parts as Part[] };
}

const STEP = { type: "step-start" };
const toolPart = (state: string) => ({
  type: "tool-sprayWindow",
  toolCallId: "c1",
  state,
  input: { city: "Lyon", date: "tomorrow" },
  ...(state === "output-available" ? { output: { error: "city_not_found" } } : {}),
  ...(state === "output-error" ? { errorText: "boom" } : {}),
});

describe("agent activity (deterministic)", () => {
  it.each([
    ["no assistant message yet", undefined, "💭 Thinking…", 1],
    ["step started", assistant([STEP]), "💭 Thinking…", 1],
    ["tool input streaming", assistant([STEP, toolPart("input-streaming")]), "🔍 Choosing a tool: sprayWindow…", 1],
    ["tool running", assistant([STEP, toolPart("input-available")]), "🔧 Running sprayWindow · city: Lyon, date: tomorrow", 1],
    ["tool finished", assistant([STEP, toolPart("output-available")]), "📊 Analysing the sprayWindow result…", 1],
    ["second step started", assistant([STEP, toolPart("output-available"), STEP]), "💭 Thinking…", 2],
    ["writing answer", assistant([STEP, toolPart("output-available"), STEP, { type: "text", text: "No" }]), "✍️ Writing the answer…", 2],
    ["tool failed", assistant([STEP, toolPart("output-error")]), "⚠️ sprayWindow failed, recovering…", 1],
  ])("%s", (_, message, label, step) => {
    const activity = currentActivity(message as AgriAgentUIMessage | undefined);
    expect(`${activity.icon} ${activity.label}`).toBe(label);
    expect(activity.step).toBe(step);
  });

  it("summarizes steps for the timeline", () => {
    const message = assistant([STEP, toolPart("output-available"), STEP, { type: "text", text: "No, wind is too strong." }]);
    expect(summarizeSteps(message)).toEqual([
      { step: 1, tools: [{ name: "sprayWindow", state: "output-available" }], wroteText: false },
      { step: 2, tools: [], wroteText: true },
    ]);
  });
});
