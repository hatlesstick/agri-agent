import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "danger";

export type BadgeProps = { tone?: BadgeTone; children: ReactNode };
