import { describe, expect, it } from "vitest";
import { SessionService } from "@/modules/identity/session/SessionService";
import { SESSION_TOUCH_INTERVAL_MS } from "@/modules/identity/session/session.constants";
import { fakeIdentityRepositories } from "@tests/support/fake-ports";

const START = new Date("2026-11-24T08:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function setup() {
  let now = START;
  const clock = () => now;
  const fakes = fakeIdentityRepositories(clock);
  const service = new SessionService(fakes.sessionsRepository, fakes.identitiesRepository, fakes.usersRepository, clock);
  return {
    service,
    fakes,
    advance(ms: number) {
      now = new Date(now.getTime() + ms);
    },
  };
}

describe("SessionService.resolve", () => {
  it("creates a user and a session for a visitor without a cookie", async () => {
    const { service, fakes } = setup();
    const session = await service.resolve(undefined);
    expect(session.setCookie).toBe(true);
    expect(session.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(fakes.state.users.size).toBe(1);
    expect(fakes.state.sessions.size).toBe(1);
    expect(session.userId).toBe([...fakes.state.users.keys()][0]);
  });

  it("returns the same user without a new cookie on the same day", async () => {
    const { service, fakes } = setup();
    const first = await service.resolve(undefined);
    const second = await service.resolve(first.token);
    expect(second).toEqual({ userId: first.userId, token: first.token, setCookie: false });
    expect(fakes.state.touches).toHaveLength(0);
  });

  it("slides the session and re-sets the cookie after a day", async () => {
    const { service, fakes, advance } = setup();
    const first = await service.resolve(undefined);
    advance(25 * HOUR);
    const later = await service.resolve(first.token);
    expect(later).toEqual({ userId: first.userId, token: first.token, setCookie: true });
    expect(fakes.state.touches).toHaveLength(1);
  });

  it("touches a session at most once per day however many requests arrive", async () => {
    const { service, fakes, advance } = setup();
    const first = await service.resolve(undefined);
    for (let index = 0; index < 20; index += 1) {
      advance(SESSION_TOUCH_INTERVAL_MS / 25);
      await service.resolve(first.token);
    }
    expect(fakes.state.touches).toHaveLength(0);
    advance(SESSION_TOUCH_INTERVAL_MS);
    await service.resolve(first.token);
    await service.resolve(first.token);
    expect(fakes.state.touches).toHaveLength(1);
  });

  it("treats an unknown token as a new visitor", async () => {
    const { service, fakes } = setup();
    const first = await service.resolve(undefined);
    const stranger = await service.resolve("not-a-real-token");
    expect(stranger.userId).not.toBe(first.userId);
    expect(stranger.setCookie).toBe(true);
    expect(stranger.token).not.toBe("not-a-real-token");
    expect(fakes.state.users.size).toBe(2);
  });

  it("treats an expired session as a new visitor", async () => {
    const { service, advance, fakes } = setup();
    const first = await service.resolve(undefined);
    advance(401 * 24 * HOUR);
    const next = await service.resolve(first.token);
    expect(next.userId).not.toBe(first.userId);
    expect(fakes.state.users.size).toBe(2);
  });
});

describe("SessionService.describe", () => {
  it("returns the user id and creation time", async () => {
    const { service } = setup();
    const { userId } = await service.resolve(undefined);
    expect(await service.describe(userId)).toEqual({ userId, createdAt: START.toISOString() });
  });

  it("reports a missing user as not found", async () => {
    const { service } = setup();
    await expect(service.describe("00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
});
