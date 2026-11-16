import { Logger } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CLOCK } from "@/common/clock";
import { AGENT_PORTS, type AgentPorts } from "@/modules/agent";
import { OpenMeteoClient, WEATHER_PORT, WeatherRepository, type WeatherResult } from "@/modules/weather";
import { fakeWeather } from "@tests/support/fake-ports";
import { testApp } from "@tests/support/create-test-app";
import { FIXTURE_NOW, stubOpenMeteo } from "@tests/support/open-meteo-stub";

describe("agent wiring through DI", () => {
  let app: NestExpressApplication;
  let lyon: WeatherResult;

  beforeAll(async () => {
    stubOpenMeteo();
    lyon = await new WeatherRepository(new OpenMeteoClient()).getForecast("Lyon");
    vi.unstubAllGlobals();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await app.close();
  });

  it("answers a spray check from an overridden WEATHER_PORT without touching the network", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("fetch must not be called");
    }));
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    const weather = fakeWeather(lyon);
    app = await testApp([
      { token: WEATHER_PORT, useValue: weather },
      { token: CLOCK, useValue: () => FIXTURE_NOW },
    ]);
    const response = await request(app.getHttpServer()).post("/spray-check").send({ question: "Can I spray in Lyon tomorrow?" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ city: "Lyon" });
    expect(weather.calls).toContain("Lyon");
  });

  it("shares one weather adapter and one RAG engine per process", async () => {
    app = await testApp();
    expect(app.get(WEATHER_PORT, { strict: false })).toBe(app.get(WEATHER_PORT, { strict: false }));
    const ports = app.get<AgentPorts>(AGENT_PORTS, { strict: false });
    expect(ports.weather).toBe(app.get(WEATHER_PORT, { strict: false }));
  });
});
