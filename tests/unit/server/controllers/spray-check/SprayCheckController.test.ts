import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/agent", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/agent")>()),
  runSprayCheck: vi.fn(),
}));

const { runSprayCheck } = await import("@/agent");
const { sprayCheckController } = await import("@/server/controllers/spray-check/SprayCheckController");

function request(question: string) {
  return new Request("http://localhost/api/spray-check", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.${Math.floor(Math.random() * 250)}.1` },
    body: JSON.stringify({ question }),
  });
}

describe("SprayCheckController error mapping", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    [new Error("GatewayRateLimitError: Rate limit exceeded"), 503, "model_busy"],
    [Object.assign(new Error("The operation timed out"), { name: "TimeoutError" }), 504, "model_timeout"],
    [new Error("boom"), 500, "internal_error"],
  ])("maps %s to a JSON %i", async (error, status, code) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(runSprayCheck).mockRejectedValueOnce(error);
    const response = await sprayCheckController.handle(request("Can I spray in Lyon tomorrow?"));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: code });
  });
});
