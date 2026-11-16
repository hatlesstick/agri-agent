import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export const REQUEST_ID_HEADER = "x-request-id";
const MAX_REQUEST_ID_LENGTH = 128;

type IdentifiedRequest = IncomingMessage & { id?: unknown };

function incomingRequestId(req: IncomingMessage): string | undefined {
  const value = req.headers[REQUEST_ID_HEADER];
  const id = Array.isArray(value) ? value[0] : value;
  return id && id.length <= MAX_REQUEST_ID_LENGTH && /^[\w.:-]+$/.test(id) ? id : undefined;
}

export function ensureRequestId(req: IncomingMessage, res: ServerResponse): string {
  const request = req as IdentifiedRequest;
  const id = typeof request.id === "string" && request.id ? request.id : (incomingRequestId(req) ?? randomUUID());
  request.id = id;
  if (!res.headersSent) res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}
