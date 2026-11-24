"use client";

import type React from "react";
import { stepLabel } from "@/ui/helpers/message-view";
import { useT } from "@/ui/hooks/useT";
import type { StepTimelineProps } from "./StepTimeline.types";

export const StepTimeline: React.FC<StepTimelineProps> = ({ steps }) => {
  const t = useT();
  return (
    <ol aria-label={t("chat.steps")} className="mb-1 flex flex-wrap items-center gap-1 text-xs text-ink-soft">
      {steps.map((step, index) => (
        <li key={step.step} className="flex items-center gap-1">
          {index > 0 && <span aria-hidden>→</span>}
          <span className="rounded-md border border-rule bg-surface px-1.5 py-0.5">{t("chat.stepLabel", { step: step.step, label: stepLabel(step) })}</span>
        </li>
      ))}
    </ol>
  );
};
