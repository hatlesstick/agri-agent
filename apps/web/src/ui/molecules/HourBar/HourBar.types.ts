import type { VerdictStatus } from "@/ui/atoms/StatusLabel";

export type HourBarProps = { time: string; status: VerdictStatus; windMs: number | null; precipMm: number | null; selected: boolean; onSelect: () => void };
