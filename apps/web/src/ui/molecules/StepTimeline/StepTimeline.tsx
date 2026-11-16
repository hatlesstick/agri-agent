import type React from "react";
import { stepLabel } from "@/ui/helpers/message-view";
import type { StepTimelineProps } from "./StepTimeline.types";

export const StepTimeline: React.FC<StepTimelineProps> = ({ steps }) => (
  <ol aria-label="Agent steps" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
    {steps.map((step, index) => (
      <li key={step.step} className="flex items-center gap-1">
        {index > 0 && <span aria-hidden>→</span>}
        <span className="rounded bg-white px-1.5 py-0.5">
          Step {step.step} · {stepLabel(step)}
        </span>
      </li>
    ))}
  </ol>
);
