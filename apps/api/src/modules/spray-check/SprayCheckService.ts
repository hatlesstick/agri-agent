import { Inject, Injectable, Logger } from "@nestjs/common";
import { runSprayCheck, screenInput, type AgentPorts } from "@agri/agent";
import { CLOCK, type Clock } from "@/common/clock";
import { AGENT_PORTS } from "@/modules/agent-bridge";
import type { SprayCheckInput, SprayCheckOutcome } from "@/modules/spray-check/SprayCheckService.types";

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
