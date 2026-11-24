import { buildHourStrip, type HourStatus, type HourView } from "@/ui/helpers/hour-strip";
import { rejectionSummary } from "@/ui/helpers/tool-parts";
import type { ToolPart } from "@/ui/helpers/tool-parts";

export type SprayDecision = { status: HourStatus; range: string | null; hours: HourView[]; rejected: string[] };

type Window = { from: string; to: string };

const clock = (stamp: string) => stamp.slice(11, 16);

export function sprayDecision(part: ToolPart): SprayDecision | null {
  if (part.type !== "tool-sprayWindow" || part.state !== "output-available") return null;
  const output = part.output as { error?: unknown; date?: string; canSpray?: boolean; bestWindow?: Window | null; windows?: Window[]; rejectedReasons?: Partial<Record<string, number>> } | undefined;
  if (!output || output.error !== undefined || typeof output.date !== "string" || !Array.isArray(output.windows)) return null;
  const best = output.bestWindow ?? null;
  return {
    status: output.canSpray ? "go" : "stop",
    range: best ? `${clock(best.from)}–${clock(best.to)}` : null,
    hours: buildHourStrip({ date: output.date, windows: output.windows, hourly: [] }),
    rejected: rejectionSummary(output.rejectedReasons ?? {}),
  };
}
