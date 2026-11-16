import { timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { isIP } from "node:net";

const UNTRUSTED_CLIENT = "untrusted-client";

function header(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function proxySecretMatches(expected: string | undefined, received: string | undefined): boolean {
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function clientKey({ proxySecret, headers, ip }: { proxySecret: string | undefined; headers: IncomingHttpHeaders; ip: string | undefined }): string {
  const forwarded = header(headers, "x-client-ip")?.trim();
  if (forwarded && isIP(forwarded) && proxySecretMatches(proxySecret, header(headers, "x-proxy-auth"))) return forwarded;
  return ip || UNTRUSTED_CLIENT;
}
