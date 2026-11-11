import { sprayAssessmentSchema, sprayWindowErrorSchema } from "@/agent/tools/spray-window/schemas";
import type { SprayCheck } from "@/agent/spray-check/schemas";

export type ToolResult = { toolName: string; output: unknown };

export type Reconciliation =
  | { ok: true; result: SprayCheck; overridden: boolean }
  | { ok: false; error: "spray_window_not_called" };

function sameWindow(left: SprayCheck["bestWindow"], right: SprayCheck["bestWindow"]): boolean {
  if (left === null || right === null) return left === right;
  return left.from === right.from && left.to === right.to;
}

export function reconcileSprayCheck(modelOutput: SprayCheck, toolResults: ToolResult[]): Reconciliation {
  const lastSprayWindow = toolResults.findLast((result) => result.toolName === "sprayWindow");
  if (!lastSprayWindow) return { ok: false, error: "spray_window_not_called" };

  const assessment = sprayAssessmentSchema.safeParse(lastSprayWindow.output);
  const rules: Pick<SprayCheck, "city" | "canSpray" | "bestWindow"> = assessment.success
    ? {
        city: assessment.data.city,
        canSpray: assessment.data.canSpray,
        bestWindow: assessment.data.bestWindow
          ? { from: assessment.data.bestWindow.from, to: assessment.data.bestWindow.to }
          : null,
      }
    : {
        city: modelOutput.city,
        canSpray: false,
        bestWindow: null,
      };

  if (!assessment.success && !sprayWindowErrorSchema.safeParse(lastSprayWindow.output).success) {
    console.warn("spray-check: unexpected sprayWindow output", lastSprayWindow.output);
  }

  const overridden = modelOutput.canSpray !== rules.canSpray || !sameWindow(modelOutput.bestWindow, rules.bestWindow);
  if (overridden) {
    console.warn("spray-check override", {
      model: { canSpray: modelOutput.canSpray, bestWindow: modelOutput.bestWindow },
      rules: { canSpray: rules.canSpray, bestWindow: rules.bestWindow },
    });
  }

  return { ok: true, result: { ...modelOutput, ...rules }, overridden };
}

const REASON_TEXT: Record<string, string> = {
  wind_too_low: "wind too low",
  wind_too_high: "wind too strong",
  too_cold: "too cold",
  too_hot: "too hot",
  precipitation_nearby: "rain within 3 hours",
  humidity_too_low: "humidity too low",
  insufficient_data: "missing forecast data",
};

export function ruleBasedAnswer(toolResults: ToolResult[]): SprayCheck | null {
  const lastSprayWindow = toolResults.findLast((result) => result.toolName === "sprayWindow");
  if (!lastSprayWindow) return null;

  const assessment = sprayAssessmentSchema.safeParse(lastSprayWindow.output);
  if (!assessment.success) {
    const failure = sprayWindowErrorSchema.safeParse(lastSprayWindow.output);
    const error = failure.success ? failure.data.error : "unexpected_tool_output";
    return { city: "", canSpray: false, bestWindow: null, reason: `No assessment available: ${error.replaceAll("_", " ")}.` };
  }

  const { city, canSpray, bestWindow, rejectedReasons, timezone } = assessment.data;
  if (canSpray && bestWindow) {
    return {
      city,
      canSpray,
      bestWindow: { from: bestWindow.from, to: bestWindow.to },
      reason: `Suitable window ${bestWindow.from}–${bestWindow.to} (${timezone} local time).`,
    };
  }

  const reasons = Object.entries(rejectedReasons)
    .sort(([, left], [, right]) => (right ?? 0) - (left ?? 0))
    .map(([reason, hours]) => `${REASON_TEXT[reason] ?? reason} (${hours} h)`);
  return { city, canSpray: false, bestWindow: null, reason: `No suitable window: ${reasons.join(", ") || "no data"}.` };
}
