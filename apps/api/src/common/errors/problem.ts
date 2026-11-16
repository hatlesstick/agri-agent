import { HttpException, HttpStatus } from "@nestjs/common";
import type { ErrorCode } from "@agri/shared/contracts";

export class ProblemException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: number,
    readonly detail?: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(code, status);
  }
}

export function problem(code: ErrorCode, status: number, detail?: string, headers?: Record<string, string>): ProblemException {
  return new ProblemException(code, status, detail, headers);
}

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: "invalid_request",
  [HttpStatus.FORBIDDEN]: "forbidden",
  [HttpStatus.NOT_FOUND]: "not_found",
  [HttpStatus.PAYLOAD_TOO_LARGE]: "payload_too_large",
  [HttpStatus.TOO_MANY_REQUESTS]: "rate_limited",
};

export function codeForStatus(status: number): ErrorCode {
  return CODE_BY_STATUS[status] ?? (status >= 400 && status < 500 ? "invalid_request" : "internal_error");
}
