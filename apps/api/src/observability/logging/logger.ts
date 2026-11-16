import type { IncomingMessage, ServerResponse } from "node:http";
import type { Options } from "pino-http";
import { ensureRequestId } from "@/common/http";
import type { ApiEnv } from "@/config";

export function pinoHttpOptions(env: ApiEnv): Options {
  return {
    level: env.LOG_LEVEL,
    genReqId: (req: IncomingMessage, res: ServerResponse) => ensureRequestId(req, res),
    autoLogging: { ignore: (req: IncomingMessage) => (req.url ?? "").startsWith("/health/") },
    redact: {
      paths: ['req.headers["x-proxy-auth"]', "req.headers.authorization", "req.headers.cookie", "req.body", "res.headers[\"set-cookie\"]"],
      censor: "[redacted]",
    },
    transport: env.NODE_ENV === "development" ? { target: "pino-pretty", options: { singleLine: true } } : undefined,
  };
}
