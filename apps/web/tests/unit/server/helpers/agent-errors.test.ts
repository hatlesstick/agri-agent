import { describe, expect, it, vi } from "vitest";
import { agentFailureResponse, chatErrorMessage, classifyAgentError } from "@/server/helpers/agent-errors";

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
  it("maps failures to JSON responses with status codes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const busy = agentFailureResponse(new Error("Rate limit"), "spray-check");
    expect(busy.status).toBe(503);
    expect(busy.headers.get("Retry-After")).toBe("60");
    expect(await busy.json()).toEqual({ error: "model_busy" });
    expect(agentFailureResponse(timeout, "spray-check").status).toBe(504);
    expect(agentFailureResponse(new Error("boom"), "spray-check").status).toBe(500);
  });

  it("maps failures to chat messages", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(chatErrorMessage(new Error("429"))).toMatch(/busy/);
    expect(chatErrorMessage(timeout)).toMatch(/too long/);
    expect(chatErrorMessage(new Error("boom"))).toBe("Something went wrong. Please try again.");
  });
});
