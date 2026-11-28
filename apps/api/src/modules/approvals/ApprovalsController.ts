import { Controller, Get, HttpCode, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { DecisionResponse, PendingActionsResponse } from "@agri/shared/contracts";
import { CLOCK, type Clock } from "@/common/clock";
import { problem } from "@/common/errors";
import { ProxyAuthGuard, RateLimited, RateLimitGuard } from "@/common/http";
import { CurrentUserId, SessionGuard } from "@/modules/identity";
import { FIELDS_REPOSITORY, type FieldsRepository } from "@/modules/fields";
import { fieldExecutors } from "@/modules/approvals/field-executors";
import type { Decision, DecideResult } from "@/modules/approvals/approvals.types";
import { PendingActionsRepository } from "@/modules/approvals/repositories/PendingActionsRepository";
import { PendingActionsService } from "@/modules/approvals/PendingActionsService";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FAILURES: Record<Exclude<DecideResult, { ok: true; action: unknown }>["reason"], { code: "not_found" | "action_not_awaiting" | "action_expired" | "action_failed"; status: number }> = {
  not_found: { code: "not_found", status: 404 },
  not_awaiting: { code: "action_not_awaiting", status: 409 },
  expired: { code: "action_expired", status: 410 },
  execution_failed: { code: "action_failed", status: 422 },
};

@ApiTags("approvals")
@Controller("approvals")
@UseGuards(ProxyAuthGuard, RateLimitGuard, SessionGuard)
export class ApprovalsController {
  constructor(
    @Inject(PendingActionsRepository) private readonly actions: PendingActionsRepository,
    @Inject(PendingActionsService) private readonly service: PendingActionsService,
    @Inject(FIELDS_REPOSITORY) private readonly fields: FieldsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get()
  @RateLimited("session")
  async list(@CurrentUserId() userId: string): Promise<PendingActionsResponse> {
    const rows = await this.actions.listAwaiting(userId, this.clock());
    return {
      actions: rows.map((row) => ({ id: row.id, type: row.type, status: row.status, expiresAt: row.expiresAt.toISOString(), payload: row.payload })),
    };
  }

  @Post(":id/confirm")
  @HttpCode(200)
  @RateLimited("session")
  confirm(@CurrentUserId() userId: string, @Param("id") id: string): Promise<DecisionResponse> {
    return this.decide(userId, id, "confirmed");
  }

  @Post(":id/reject")
  @HttpCode(200)
  @RateLimited("session")
  reject(@CurrentUserId() userId: string, @Param("id") id: string): Promise<DecisionResponse> {
    return this.decide(userId, id, "rejected");
  }

  private async decide(userId: string, id: string, decision: Decision): Promise<DecisionResponse> {
    if (!UUID.test(id)) throw problem("not_found", 404);
    const result = await this.service.decide({ userId, actionId: id, decision, now: this.clock(), executors: fieldExecutors(this.fields) });
    if (result.ok) return { id: result.action.id, status: result.action.status };
    const failure = FAILURES[result.reason];
    throw problem(failure.code, failure.status);
  }
}
