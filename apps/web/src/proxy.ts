import { NextResponse, type NextRequest } from "next/server";

function clientAddress(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || undefined;
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
