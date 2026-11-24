import type { Request } from "express";
import type { sessions, users } from "@/database/schema";

export type IdentityProvider = "web" | "telegram" | "mcp" | "github" | "google";

export type FindOrCreateUserInput = { provider: IdentityProvider; externalId: string; displayName?: string; locale?: string };

export type FindOrCreateUserResult = { userId: string; created: boolean };

export type User = typeof users.$inferSelect;

export type Session = typeof sessions.$inferSelect;

export type IdentitiesPort = {
  findOrCreateUser(input: FindOrCreateUserInput): Promise<FindOrCreateUserResult>;
  findUserId(provider: IdentityProvider, externalId: string): Promise<string | null>;
  attach(userId: string, provider: IdentityProvider, externalId: string): Promise<boolean>;
};

export type UsersPort = {
  getById(userId: string): Promise<User | null>;
};

export type SessionsPort = {
  create(userId: string, tokenHash: string, now: Date): Promise<Session>;
  findActive(tokenHash: string, now: Date): Promise<Session | null>;
  touch(sessionId: string, now: Date): Promise<void>;
  delete(tokenHash: string): Promise<boolean>;
};

export type ResolvedSession = { userId: string; token: string; setCookie: boolean };

export type SessionRequest = Request & { userId: string };
