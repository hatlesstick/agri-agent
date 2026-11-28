import { Inject, Injectable } from "@nestjs/common";
import { todayIn } from "@agri/shared";
import { API_ENV, type ApiEnv } from "@/config";
import { problem } from "@/common/errors";
import type { TokenUsage } from "@/modules/usage/usage.types";
import { UsageRepository } from "@/modules/usage/repositories/UsageRepository";

@Injectable()
export class UsageService {
  constructor(
    @Inject(UsageRepository) private readonly usage: UsageRepository,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  async assertWithinDailyLimit(userId: string, now: Date): Promise<void> {
    const used = await this.usage.totalTokens(userId, todayIn("UTC", now));
    if (used >= this.env.DAILY_TOKEN_LIMIT) throw problem("daily_limit_reached", 429);
  }

  record(userId: string, now: Date, usage: TokenUsage): Promise<void> {
    if (usage.inputTokens === 0 && usage.outputTokens === 0) return Promise.resolve();
    return this.usage.add(userId, todayIn("UTC", now), usage);
  }
}
