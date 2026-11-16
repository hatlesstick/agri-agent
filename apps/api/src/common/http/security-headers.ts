import type { NextFunction, Request, Response } from "express";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-site",
};

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.set(SECURITY_HEADERS);
  next();
}
