import { Inject, Injectable, Logger } from "@nestjs/common";
import { AGENT_PORTS, runSprayCheck, screenInput, type AgentPorts } from "@/modules/agent";
import { CLOCK, type Clock } from "@/common/clock";
import type { SprayCheckInput, SprayCheckOutcome } from "@/modules/spray-check/spray-check.types";

@Injectable()
export class SprayCheckService {
  private readonly logger = new Logger(SprayCheckService.name);

  constructor(
    @Inject(AGENT_PORTS) private readonly ports: AgentPorts,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async check({ question, abortSignal }: SprayCheckInput): Promise<SprayCheckOutcome> {
    const screen = screenInput(question);
    if (screen.verdict === "block") {
      this.logger.warn({ reason: screen.reason }, "guardrail: spray-check input blocked");
      return { ok: false, error: "blocked_input" };
    }
    return runSprayCheck({ question, abortSignal, ports: this.ports, now: this.clock() });
  }
}
