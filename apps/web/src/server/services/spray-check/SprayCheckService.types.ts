import type { runSprayCheck } from "@/agent";

type SprayCheckRun = Awaited<ReturnType<typeof runSprayCheck>>;

export type SprayCheckOutcome = SprayCheckRun | { ok: false; error: "blocked_input" };

export type SprayCheckFailure = Extract<SprayCheckOutcome, { ok: false }>["error"];

export type SprayCheckInput = { question: string; abortSignal?: AbortSignal };
