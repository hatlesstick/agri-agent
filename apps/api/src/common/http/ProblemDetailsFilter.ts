import { Catch, HttpException, HttpStatus, Logger, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import { STATUS_CODES } from "node:http";
import type { ErrorCode, ProblemDetails } from "@agri/shared/contracts";
import { codeForStatus, ProblemException } from "@/common/http/problem";

type BodyParserError = { type?: string; status?: number };

function isBodyParserError(error: unknown): error is BodyParserError {
  return typeof error === "object" && error !== null && "type" in error && typeof (error as BodyParserError).type === "string";
}

function resolve(exception: unknown): { status: number; code: ErrorCode; detail?: string; headers: Record<string, string> } {
  if (exception instanceof ProblemException) {
    return { status: exception.getStatus(), code: exception.code, detail: exception.detail, headers: exception.headers };
  }
  if (exception instanceof HttpException) return { status: exception.getStatus(), code: codeForStatus(exception.getStatus()), headers: {} };
  if (isBodyParserError(exception)) {
    if (exception.type === "entity.too.large") return { status: HttpStatus.PAYLOAD_TOO_LARGE, code: "payload_too_large", headers: {} };
    if (exception.status && exception.status < 500) return { status: HttpStatus.BAD_REQUEST, code: "invalid_request", headers: {} };
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: "internal_error", headers: {} };
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();
    const { status, code, detail, headers } = resolve(exception);
    if (status >= 500) this.logger.error({ err: exception, code }, "request failed");
    if (response.headersSent) return;
    const body: ProblemDetails = {
      type: "about:blank",
      title: STATUS_CODES[status] ?? "Error",
      status,
      ...(detail ? { detail } : {}),
      instance: String(request.id ?? ""),
      code,
    };
    response.status(status).set(headers).type("application/problem+json").send(JSON.stringify(body));
  }
}
