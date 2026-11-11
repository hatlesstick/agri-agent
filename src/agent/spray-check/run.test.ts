import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSprayCheck } from "@/agent/spray-check/run";
import forecastLyon from "@/domain/weather/__fixtures__/forecast-lyon.json";
import geocodingLyon from "@/domain/weather/__fixtures__/geocoding-lyon.json";
import { clearForecastCache } from "@/domain/weather/forecast";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function modelThatNeverStopsCallingTools() {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "tool-call", toolCallId: `call-${Math.random()}`, toolName: "sprayWindow", input: JSON.stringify({ city: "Lyon", date: "tomorrow" }) }],
      finishReason: { unified: "tool-calls", raw: undefined },
      usage: USAGE,
      warnings: [],
    }),
  });
}

describe("runSprayCheck", () => {
  beforeEach(() => {
    clearForecastCache();
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => (new URL(String(input)).host.startsWith("geocoding") ? json(geocodingLyon) : json(forecastLyon))));
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to the rules when the step limit ends the run without an object", async () => {
    const outcome = await runSprayCheck({
      question: "Can I spray in Lyon tomorrow?",
      model: modelThatNeverStopsCallingTools(),
      now: new Date("2026-11-11T08:30:00Z"),
    });
    expect(outcome).toMatchObject({ ok: true, reasonSource: "rules", result: { city: "Lyon" } });
  });
});
