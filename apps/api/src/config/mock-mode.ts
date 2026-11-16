import { loadApiEnv } from "@/config/api-env";

export function isMockMode(): boolean {
  return loadApiEnv().AI_MOCK;
}
