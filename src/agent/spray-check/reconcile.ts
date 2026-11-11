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
