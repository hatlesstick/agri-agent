import { Inject, Injectable } from "@nestjs/common";
import type { DecideInput, DecideResult, PendingActionRecord, ProposeInput } from "@/modules/approvals/approvals.types";
import { PendingActionsRepository } from "@/modules/approvals/repositories/PendingActionsRepository";

@Injectable()
export class PendingActionsService {
  constructor(@Inject(PendingActionsRepository) private readonly repository: PendingActionsRepository) {}

  propose({ userId, ...input }: ProposeInput): Promise<PendingActionRecord> {
    return this.repository.propose(userId, input);
  }

  async decide({ userId, actionId, decision, now, executors }: DecideInput): Promise<DecideResult> {
    const claimed = await this.repository.claim(userId, actionId, decision, now);
    if (!claimed) return this.explainNoClaim(userId, actionId);

    if (decision === "rejected") {
      await this.repository.audit(userId, actionId, "action.rejected", { type: claimed.type });
      return { ok: true, action: claimed };
    }

    const executor = executors[claimed.type];
    try {
      if (!executor) throw new Error(`no executor for ${claimed.type}`);
      await executor(claimed);
    } catch {
      await this.repository.setStatus(userId, actionId, "failed", now);
      await this.repository.audit(userId, actionId, "action.failed", { type: claimed.type });
      return { ok: false, reason: "execution_failed" };
    }

    await this.repository.setStatus(userId, actionId, "executed", now);
    await this.repository.audit(userId, actionId, "action.executed", { type: claimed.type });
    return { ok: true, action: { ...claimed, status: "executed" } };
  }

  private async explainNoClaim(userId: string, actionId: string): Promise<DecideResult> {
    const current = await this.repository.find(userId, actionId);
    if (!current) return { ok: false, reason: "not_found" };
    if (current.status === "awaiting_confirmation") return { ok: false, reason: "expired" };
    return { ok: false, reason: "not_awaiting" };
  }
}
