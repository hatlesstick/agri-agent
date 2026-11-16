import { pgEnum } from "drizzle-orm/pg-core";

export const channelEnum = pgEnum("channel", ["web", "telegram", "mcp"]);

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const pendingActionStatusEnum = pgEnum("pending_action_status", ["awaiting_confirmation", "confirmed", "rejected", "expired", "executed", "failed"]);

export const auditActorEnum = pgEnum("audit_actor", ["agent", "user", "system"]);
