import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it } from "vitest";
import { loadApiEnv } from "@/config";
import { pinoHttpOptions } from "@/observability/logging/logger";

const env = loadApiEnv({
  OPEN_METEO_GEOCODING_URL: "https://geocoding-api.open-meteo.com/v1/search",
  OPEN_METEO_FORECAST_URL: "https://api.open-meteo.com/v1/forecast",
  DATABASE_URL: "postgres://agri:agri@127.0.0.1:5432/agri",
  NODE_ENV: "test",
});

function fakeExchange(headers: Record<string, string>) {
  const set: Record<string, string> = {};
  const req = { headers } as unknown as IncomingMessage;
  const res = { setHeader: (name: string, value: string) => (set[name.toLowerCase()] = value) } as unknown as ServerResponse;
  return { req, res, set };
}

describe("pinoHttpOptions", () => {
  it("reuses an incoming x-request-id and echoes it", () => {
    const { req, res, set } = fakeExchange({ "x-request-id": "abc-123" });
    expect(pinoHttpOptions(env).genReqId?.(req, res)).toBe("abc-123");
    expect(set["x-request-id"]).toBe("abc-123");
  });

  it("generates a request id when none is sent", () => {
    const { req, res, set } = fakeExchange({});
    const id = String(pinoHttpOptions(env).genReqId?.(req, res));
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(set["x-request-id"]).toBe(id);
  });

  it("redacts secrets and bodies", () => {
    const redact = pinoHttpOptions(env).redact as { paths: string[] };
    expect(redact.paths).toEqual(expect.arrayContaining(['req.headers["x-proxy-auth"]', "req.headers.authorization", "req.headers.cookie", "req.body"]));
  });

  it("does not log health probes", () => {
    const autoLogging = pinoHttpOptions(env).autoLogging as { ignore: (req: IncomingMessage) => boolean };
    expect(autoLogging.ignore({ url: "/health/live" } as IncomingMessage)).toBe(true);
    expect(autoLogging.ignore({ url: "/health/ready" } as IncomingMessage)).toBe(true);
    expect(autoLogging.ignore({ url: "/chat" } as IncomingMessage)).toBe(false);
  });
});
