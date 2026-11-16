import { NextResponse, type NextRequest } from "next/server";

function clientAddress(request: NextRequest): string | undefined {
  const platform = request.headers.get("x-real-ip")?.trim();
  if (platform) return platform;
  const hops = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  return hops.at(-1);
}

export function proxy(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.delete("x-proxy-auth");
  headers.delete("x-client-ip");
  const secret = process.env.PROXY_AUTH_SECRET;
  if (secret) headers.set("x-proxy-auth", secret);
  const address = clientAddress(request);
  if (address) headers.set("x-client-ip", address);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/api/:path*" };
