import { EventEmitter } from "node:events";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { lastValueFrom, of, throwError } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { TelemetryFlushInterceptor } from "@/observability";

function context(res: EventEmitter): ExecutionContext {
  return { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ExecutionContext;
}

describe("TelemetryFlushInterceptor", () => {
  it("flushes once after the response finishes when telemetry is enabled", async () => {
    const flush = vi.fn(async () => {});
    const res = new EventEmitter();
    const interceptor = new TelemetryFlushInterceptor({ enabled: () => true, flush });
    await lastValueFrom(interceptor.intercept(context(res), { handle: () => of("ok") } as CallHandler));
    expect(flush).not.toHaveBeenCalled();
    res.emit("finish");
    res.emit("close");
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("flushes after a failed request and never when telemetry is disabled", async () => {
    const flush = vi.fn(async () => {});
    const res = new EventEmitter();
    await expect(lastValueFrom(new TelemetryFlushInterceptor({ enabled: () => true, flush }).intercept(context(res), { handle: () => throwError(() => new Error("boom")) } as CallHandler))).rejects.toThrow("boom");
    res.emit("close");
    expect(flush).toHaveBeenCalledTimes(1);
    const silent = vi.fn(async () => {});
    const other = new EventEmitter();
    await lastValueFrom(new TelemetryFlushInterceptor({ enabled: () => false, flush: silent }).intercept(context(other), { handle: () => of("ok") } as CallHandler));
    other.emit("finish");
    expect(silent).not.toHaveBeenCalled();
  });
});
