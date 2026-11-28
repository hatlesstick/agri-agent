export type Channel = "web" | "telegram" | "mcp" | "github" | "google";

export type PendingActionRecord = {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  status: string;
  expiresAt: Date;
};

export type ProposeInput = {
  userId: string;
  channel: Channel;
  type: string;
  payload: Record<string, unknown>;
  expiresAt: Date;
  idempotencyKey: string;
};

export type Decision = "confirmed" | "rejected";

export type DecideInput = {
  userId: string;
  actionId: string;
  decision: Decision;
  now: Date;
  executors: Record<string, ActionExecutor>;
};

export type DecideResult =
  | { ok: true; action: PendingActionRecord }
  | { ok: false; reason: "not_found" | "not_awaiting" | "expired" | "execution_failed" };

export type ActionExecutor = (action: PendingActionRecord) => Promise<void>;
