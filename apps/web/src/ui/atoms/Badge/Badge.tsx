import type React from "react";
import type { BadgeProps, BadgeTone } from "./Badge.types";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-zinc-100 text-zinc-600",
  danger: "bg-red-100 text-red-700",
};

export const Badge: React.FC<BadgeProps> = ({ tone = "neutral", children }) => (
  <span className={`rounded px-2 py-0.5 text-xs ${TONE_CLASS[tone]}`}>{children}</span>
);
