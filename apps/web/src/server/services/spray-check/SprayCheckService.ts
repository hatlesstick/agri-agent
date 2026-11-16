import { runSprayCheck, screenInput } from "@/agent";
import type { SprayCheckInput, SprayCheckOutcome } from "@/server/services/spray-check/SprayCheckService.types";

export class SprayCheckService {
  async check({ question, abortSignal }: SprayCheckInput): Promise<SprayCheckOutcome> {
    const screen = screenInput(question);
    if (screen.verdict === "block") {
      console.warn("guardrail: spray-check input blocked", { reason: screen.reason });
      return { ok: false, error: "blocked_input" };
    }
    return runSprayCheck({ question, abortSignal });
  }
}

export const sprayCheckService = new SprayCheckService();
