import { describe, expect, it } from "vitest";
import type { AgriChatMessage } from "@agri/shared/contracts";
import type { AgriAgentUIMessage } from "@/agent";

const toContract = (message: AgriAgentUIMessage): AgriChatMessage => message;
const fromContract = (message: AgriChatMessage): AgriAgentUIMessage => message;

describe("chat message contract", () => {
  it("is assignable to and from the agent's inferred UI message type", () => {
    const message: AgriChatMessage = { id: "m1", role: "user", parts: [{ type: "text", text: "Can I spray in Lyon tomorrow?" }] };
    expect(fromContract(toContract(fromContract(message)))).toBe(message);
  });
});
