import { describe, expect, it } from "vitest";
import { agentFailure, chatErrorMessage, classifyAgentError } from "@/modules/agent";

const timeout = Object.assign(new Error("The operation timed out"), { name: "TimeoutError" });

describe("classifyAgentError", () => {
  it.each([
    [new Error("GatewayRateLimitError: Rate limit exceeded"), "rate_limited"],
    [new Error("status 429"), "rate_limited"],
    [timeout, "timed_out"],
    [Object.assign(new Error("aborted"), { name: "AbortError" }), "timed_out"],
    [new Error("boom"), "internal"],
    ["plain string", "internal"],
  ])("classifies %s as %s", (error, kind) => {
    expect(classifyAgentError(error)).toBe(kind);
  });
});

describe("agent error responses", () => {
  it("maps failures to problems with status codes", () => {
    const busy = agentFailure(new Error("Rate limit"), "spray-check");
    expect(busy.getStatus()).toBe(503);
    expect(busy.code).toBe("model_busy");
    expect(busy.headers).toEqual({ "Retry-After": "60" });
    expect(agentFailure(timeout, "spray-check").code).toBe("model_timeout");
    expect(agentFailure(new Error("boom"), "spray-check").getStatus()).toBe(500);
  });

  it("maps failures to chat messages", () => {
    expect(chatErrorMessage(new Error("429"))).toMatch(/busy/);
    expect(chatErrorMessage(timeout)).toMatch(/too long/);
    expect(chatErrorMessage(new Error("boom"))).toBe("Something went wrong. Please try again.");
  });
});
