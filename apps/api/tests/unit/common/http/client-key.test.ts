import { describe, expect, it } from "vitest";
import { clientKey } from "@/common/http";

const SECRET = "s".repeat(40);

describe("clientKey", () => {
  it("uses x-client-ip only with a valid proxy secret", () => {
    expect(clientKey({ proxySecret: SECRET, headers: { "x-proxy-auth": SECRET, "x-client-ip": "203.0.113.7" }, ip: "10.0.0.1" })).toBe("203.0.113.7");
  });

  it("falls back to the socket address for a wrong, missing or unconfigured secret", () => {
    expect(clientKey({ proxySecret: SECRET, headers: { "x-proxy-auth": "wrong", "x-client-ip": "203.0.113.7" }, ip: "10.0.0.1" })).toBe("10.0.0.1");
    expect(clientKey({ proxySecret: SECRET, headers: { "x-client-ip": "203.0.113.7" }, ip: "10.0.0.1" })).toBe("10.0.0.1");
    expect(clientKey({ proxySecret: undefined, headers: { "x-proxy-auth": SECRET, "x-client-ip": "203.0.113.7" }, ip: "10.0.0.1" })).toBe("10.0.0.1");
  });

  it("ignores an invalid client address and an unknown socket", () => {
    expect(clientKey({ proxySecret: SECRET, headers: { "x-proxy-auth": SECRET, "x-client-ip": "not-an-ip" }, ip: "10.0.0.1" })).toBe("10.0.0.1");
    expect(clientKey({ proxySecret: SECRET, headers: {}, ip: undefined })).toBe("untrusted-client");
  });
});
