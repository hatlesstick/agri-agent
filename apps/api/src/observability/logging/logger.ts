import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Options } from "pino-http";
import type { ApiEnv } from "@/config";

const REQUEST_ID_HEADER = "x-request-id";
const MAX_REQUEST_ID_LENGTH = 128;

function incomingRequestId(req: IncomingMessage): string | undefined {
  const value = req.headers[REQUEST_ID_HEADER];
  const id = Array.isArray(value) ? value[0] : value;
  return id && id.length <= MAX_REQUEST_ID_LENGTH && /^[\w.:-]+$/.test(id) ? id : undefined;
}

export function pinoHttpOptions(env: ApiEnv): Options {
  return {
    level: env.LOG_LEVEL,
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const id = incomingRequestId(req) ?? randomUUID();
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    redact: {
      paths: ['req.headers["x-proxy-auth"]', "req.headers.authorization", "req.headers.cookie", "req.body", "res.headers[\"set-cookie\"]"],
      censor: "[redacted]",
    },
    transport: env.NODE_ENV === "development" ? { target: "pino-pretty", options: { singleLine: true } } : undefined,
  };
}
