import type { users } from "@/database/schema";

export type IdentityProvider = "web" | "telegram" | "mcp";

export type FindOrCreateUserInput = { provider: IdentityProvider; externalId: string; displayName?: string; locale?: string };

export type FindOrCreateUserResult = { userId: string; created: boolean };

export type User = typeof users.$inferSelect;
