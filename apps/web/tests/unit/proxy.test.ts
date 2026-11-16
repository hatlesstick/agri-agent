import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

const SECRET = "w".repeat(40);

function forwardedHeader(response: Response, name: string): string | null {
  return response.headers.get(`x-middleware-request-${name}`);
}

describe("proxy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("replaces a forged client address and adds the proxy secret", () => {
    vi.stubEnv("PROXY_AUTH_SECRET", SECRET);
    const response = proxy(new NextRequest("http://localhost:3000/api/chat", { headers: { "x-client-ip": "6.6.6.6", "x-proxy-auth": "forged", "x-forwarded-for": "198.51.100.4, 10.0.0.1" } }));
    expect(forwardedHeader(response, "x-client-ip")).toBe("198.51.100.4");
    expect(forwardedHeader(response, "x-proxy-auth")).toBe(SECRET);
  });

  it("does not forward any proxy secret when none is configured", () => {
    vi.stubEnv("PROXY_AUTH_SECRET", "");
    const response = proxy(new NextRequest("http://localhost:3000/api/chat", { headers: { "x-proxy-auth": "forged", "x-real-ip": "203.0.113.9" } }));
    expect(forwardedHeader(response, "x-proxy-auth")).toBeNull();
    expect(forwardedHeader(response, "x-client-ip")).toBe("203.0.113.9");
  });
});
