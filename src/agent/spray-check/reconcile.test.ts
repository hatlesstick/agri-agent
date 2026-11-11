import { afterEach, describe, expect, it, vi } from "vitest";
import { reconcileSprayCheck, ruleBasedAnswer, type ToolResult } from "@/agent/spray-check/reconcile";
import type { SprayCheck } from "@/agent/spray-check/schemas";

const assessment = (overrides: Record<string, unknown> = {}) => ({
  city: "Lyon",
  date: "2026-11-12",
  timezone: "Europe/Paris",
  canSpray: true,
  bestWindow: { from: "2026-11-12T14:00", to: "2026-11-13T00:00", hours: 10 },
  windows: [{ from: "2026-11-12T14:00", to: "2026-11-13T00:00", hours: 10 }],
  rejectedReasons: { precipitation_nearby: 9 },
  ...overrides,
});

const sprayWindowResult = (output: unknown): ToolResult => ({ toolName: "sprayWindow", output });

const modelSays = (overrides: Partial<SprayCheck> = {}): SprayCheck => ({
  city: "Lyon",
  canSpray: true,
  bestWindow: { from: "2026-11-12T14:00", to: "2026-11-13T00:00" },
  reason: "Rain until 10:00, afternoon is fine.",
  ...overrides,
});

describe("reconcileSprayCheck", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps model output when it agrees with sprayWindow", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(reconcileSprayCheck(modelSays(), [sprayWindowResult(assessment())])).toEqual({ ok: true, result: modelSays(), overridden: false, reasonSource: "model" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("overwrites canSpray, bestWindow and the contradicting reason when the model disagrees", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const outcome = reconcileSprayCheck(modelSays({ canSpray: false, bestWindow: null, reason: "Too windy, do not spray." }), [sprayWindowResult(assessment())]);
    expect(outcome).toEqual({
      ok: true,
      result: { ...modelSays(), reason: "Suitable window 2026-11-12T14:00–2026-11-13T00:00 (Europe/Paris local time)." },
      overridden: true,
      reasonSource: "rules",
    });
    expect(warn).toHaveBeenCalledWith("spray-check override", expect.anything());
  });

  it("takes city from the rules, keeps the model's reason", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const outcome = reconcileSprayCheck(modelSays({ city: "lyon", reason: "custom" }), [sprayWindowResult(assessment())]);
    expect(outcome).toMatchObject({ ok: true, result: { city: "Lyon", reason: "custom" } });
  });

  it("uses the last sprayWindow result when called twice", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const outcome = reconcileSprayCheck(modelSays(), [
      sprayWindowResult(assessment()),
      sprayWindowResult(assessment({ canSpray: false, bestWindow: null, windows: [] })),
    ]);
    expect(outcome).toMatchObject({ ok: true, result: { canSpray: false, bestWindow: null }, overridden: true });
  });

  it("returns spray_window_not_called when only getWeather ran", () => {
    expect(reconcileSprayCheck(modelSays(), [{ toolName: "getWeather", output: {} }])).toEqual({ ok: false, error: "spray_window_not_called" });
  });

  it("returns spray_window_not_called when no tools ran", () => {
    expect(reconcileSprayCheck(modelSays(), [])).toEqual({ ok: false, error: "spray_window_not_called" });
  });

  it("sets canSpray false and bestWindow null when sprayWindow returned an error", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const outcome = reconcileSprayCheck(modelSays(), [sprayWindowResult({ error: "city_not_found" })]);
    expect(outcome).toMatchObject({ ok: true, result: { canSpray: false, bestWindow: null }, overridden: true });
  });
});

describe("ruleBasedAnswer", () => {
  it("builds an answer from a positive assessment", () => {
    expect(ruleBasedAnswer([sprayWindowResult(assessment())])).toEqual({
      city: "Lyon",
      canSpray: true,
      bestWindow: { from: "2026-11-12T14:00", to: "2026-11-13T00:00" },
      reason: "Suitable window 2026-11-12T14:00–2026-11-13T00:00 (Europe/Paris local time).",
    });
  });

  it("lists rejection reasons, most frequent first", () => {
    const answer = ruleBasedAnswer([
      sprayWindowResult(assessment({ canSpray: false, bestWindow: null, windows: [], rejectedReasons: { too_cold: 3, wind_too_high: 20 } })),
    ]);
    expect(answer?.reason).toBe("No suitable window: wind too strong (20 h), too cold (3 h).");
  });

  it("explains tool errors", () => {
    expect(ruleBasedAnswer([sprayWindowResult({ error: "weather_unavailable" })])?.reason).toBe("No assessment available: weather unavailable.");
  });

  it("returns null without a sprayWindow result", () => {
    expect(ruleBasedAnswer([])).toBeNull();
  });
});
