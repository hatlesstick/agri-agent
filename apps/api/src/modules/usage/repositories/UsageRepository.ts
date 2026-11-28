import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DATABASE, type DatabaseHandle } from "@/database";
import { usageDaily } from "@/database/schema";
import type { TokenUsage } from "@/modules/usage/usage.types";

@Injectable()
export class UsageRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async totalTokens(userId: string, date: string): Promise<number> {
    const rows = await this.database
      .get()
      .select({ input: usageDaily.inputTokens, output: usageDaily.outputTokens })
      .from(usageDaily)
      .where(and(eq(usageDaily.userId, userId), eq(usageDaily.date, date)));
    return rows[0] ? rows[0].input + rows[0].output : 0;
  }

  async add(userId: string, date: string, usage: TokenUsage): Promise<void> {
    await this.database
      .get()
      .insert(usageDaily)
      .values({ userId, date, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens })
      .onConflictDoUpdate({
        target: [usageDaily.userId, usageDaily.date],
        set: {
          inputTokens: sql`${usageDaily.inputTokens} + ${usage.inputTokens}`,
          outputTokens: sql`${usageDaily.outputTokens} + ${usage.outputTokens}`,
        },
      });
  }
}
