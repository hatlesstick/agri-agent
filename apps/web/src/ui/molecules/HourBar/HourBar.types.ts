import type { VerdictStatus } from "@/ui/atoms/StatusLabel";

export type HourBarProps = { time: string; status: VerdictStatus; windMs: number; precipMm: number; selected: boolean; onSelect: () => void };
