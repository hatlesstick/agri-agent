import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditActorEnum, channelEnum, pendingActionStatusEnum } from "@/database/schema/enums";
import { fields } from "@/database/schema/fields";
import { users } from "@/database/schema/users";

export const pendingActions = pgTable(
  "pending_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id").references(() => fields.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    status: pendingActionStatusEnum("status").notNull().default("awaiting_confirmation"),
    channel: channelEnum("channel").notNull(),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    runId: text("run_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pending_actions_user_status_idx").on(table.userId, table.status),
    index("pending_actions_status_expires_idx").on(table.status, table.expiresAt),
    index("pending_actions_field_id_idx").on(table.fieldId),
    uniqueIndex("pending_actions_user_idempotency_unique").on(table.userId, table.idempotencyKey),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    actor: auditActorEnum("actor").notNull(),
    action: text("action").notNull(),
    payload: jsonb("payload").notNull(),
    pendingActionId: uuid("pending_action_id").references(() => pendingActions.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_user_id_idx").on(table.userId),
    index("audit_log_created_at_idx").on(table.createdAt),
    index("audit_log_pending_action_id_idx").on(table.pendingActionId),
  ],
);
