import { randomUUID } from "node:crypto";
import type { RagCandidate, RagEngine } from "@/modules/rag";
import type { IdentitiesPort, Session, SessionsPort, User, UsersPort } from "@/modules/identity";
import { SESSION_TTL_MS } from "@/modules/identity/session/session.constants";
import type { WeatherPort } from "@/modules/weather";
import type { WeatherResult } from "@/modules/weather/weather.types";

export function fakeWeather(result: WeatherResult): WeatherPort & { calls: string[]; placeCalls: Array<{ name: string; latitude: number; longitude: number }> } {
  const calls: string[] = [];
  const placeCalls: Array<{ name: string; latitude: number; longitude: number }> = [];
  return {
    calls,
    placeCalls,
    async getForecast(city) {
      calls.push(city);
      return result;
    },
    async getForecastAt(place) {
      placeCalls.push(place);
      return result;
    },
  };
}

export function fakeRag(result: RagCandidate[] | null | Error): RagEngine & { calls: Array<{ query: string; topK: number }> } {
  const calls: Array<{ query: string; topK: number }> = [];
  return {
    calls,
    async search(query, { topK }) {
      calls.push({ query, topK });
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

export function fakeIdentityRepositories(clock: () => Date) {
  const users = new Map<string, User>();
  const identityOwners = new Map<string, string>();
  const sessions = new Map<string, Session>();
  const touches: string[] = [];

  const identitiesRepository: IdentitiesPort = {
    async listProviders(userId) {
      return [...identityOwners.entries()].filter(([, owner]) => owner === userId).map(([key]) => key.split(":")[0]);
    },
    async findUserId(provider, externalId) {
      return identityOwners.get(`${provider}:${externalId}`) ?? null;
    },
    async attach(userId, provider, externalId) {
      const key = `${provider}:${externalId}`;
      if (identityOwners.has(key)) return false;
      identityOwners.set(key, userId);
      return true;
    },
    async findOrCreateUser({ provider, externalId }) {
      const key = `${provider}:${externalId}`;
      const existing = identityOwners.get(key);
      if (existing) return { userId: existing, created: false };
      const now = clock();
      const user: User = { id: randomUUID(), displayName: null, avatarUrl: null, locale: "en", createdAt: now, updatedAt: now };
      users.set(user.id, user);
      identityOwners.set(key, user.id);
      return { userId: user.id, created: true };
    },
  };

  const usersRepository: UsersPort = {
    async getById(userId) {
      return users.get(userId) ?? null;
    },
    async updateProfile(userId, profile) {
      const user = users.get(userId);
      if (user) users.set(userId, { ...user, ...profile });
    },
  };

  const sessionsRepository: SessionsPort = {
    async create(userId, tokenHash, now) {
      const session: Session = { id: randomUUID(), userId, tokenHash, createdAt: now, lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) };
      sessions.set(session.id, session);
      return session;
    },
    async findActive(tokenHash, now) {
      return [...sessions.values()].find((session) => session.tokenHash === tokenHash && session.expiresAt > now) ?? null;
    },
    async delete(tokenHash) {
      const existing = [...sessions.values()].find((session) => session.tokenHash === tokenHash);
      if (existing) sessions.delete(existing.id);
      return existing !== undefined;
    },
    async touch(sessionId, now) {
      const session = sessions.get(sessionId);
      if (!session) return;
      touches.push(sessionId);
      sessions.set(sessionId, { ...session, lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) });
    },
  };

  return { identitiesRepository, usersRepository, sessionsRepository, state: { users, sessions, touches } };
}

