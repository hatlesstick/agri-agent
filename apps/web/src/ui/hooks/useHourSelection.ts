"use client";

import { useState } from "react";
import type { HourView } from "@/ui/helpers/hour-strip";

export function useHourSelection(hours: HourView[]): [number, (index: number) => void] {
  const firstGo = hours.findIndex((hour) => hour.status === "go");
  const [selected, setSelected] = useState(firstGo === -1 ? 0 : firstGo);
  return [selected, setSelected];
}
