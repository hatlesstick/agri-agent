"use client";

import type React from "react";
import type { AgriChatMessage } from "@agri/shared/contracts";
import { useSaveForecast } from "@/ui/hooks/useForecastMemory";

export const ForecastSaver: React.FC<{ messages: AgriChatMessage[] }> = ({ messages }) => {
  useSaveForecast(messages);
  return null;
};
