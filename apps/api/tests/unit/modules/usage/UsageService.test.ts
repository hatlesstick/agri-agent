import { describe, expect, it } from "vitest";
import { UsageService } from "@/modules/usage/UsageService";
import type { UsageRepository } from "@/modules/usage/repositories/UsageRepository";
import type { ApiEnv } from "@/config";

const NOW = new Date("2026-11-28T10:00:00Z");

function service(used: number, limit: number) {
  const calls: Array<{ date: string; input: number; output: number }> = [];
  const repository = {
    totalTokens: async () => used,
    add: async (_user: string, date: string, usage: { inputTokens: number; outputTokens: number }) => {
      calls.push({ date, input: usage.inputTokens, output: usage.outputTokens });
    },
  } as unknown as UsageRepository;
  return { calls, service: new UsageService(repository, { DAILY_TOKEN_LIMIT: limit } as ApiEnv) };
}

describe("UsageService", () => {
  it("lets a user under the daily limit through", async () => {
    const { service: usage } = service(199_999, 200_000);
    await expect(usage.assertWithinDailyLimit("u", NOW)).resolves.toBeUndefined();
  });

  it("refuses a user who reached the daily limit with daily_limit_reached", async () => {
    const { service: usage } = service(200_000, 200_000);
    await expect(usage.assertWithinDailyLimit("u", NOW)).rejects.toMatchObject({ status: 429 });
  });

  it("records the tokens against the UTC day", async () => {
    const { service: usage, calls } = service(0, 200_000);
    await usage.record("u", NOW, { inputTokens: 10, outputTokens: 3 });
    expect(calls).toEqual([{ date: "2026-11-28", input: 10, output: 3 }]);
  });

  it("records nothing for a reply that used no tokens", async () => {
    const { service: usage, calls } = service(0, 200_000);
    await usage.record("u", NOW, { inputTokens: 0, outputTokens: 0 });
    expect(calls).toEqual([]);
  });
});
