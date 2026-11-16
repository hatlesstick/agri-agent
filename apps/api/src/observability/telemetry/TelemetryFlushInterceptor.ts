import { Inject, Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from "@nestjs/common";
import type { EventEmitter } from "node:events";
import type { Observable } from "rxjs";

export type TelemetryControl = { enabled: () => boolean; flush: () => Promise<void> };

export const TELEMETRY = Symbol("TELEMETRY");

@Injectable()
export class TelemetryFlushInterceptor implements NestInterceptor {
  constructor(@Inject(TELEMETRY) private readonly telemetry: TelemetryControl) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.telemetry.enabled()) {
      const response = context.switchToHttp().getResponse<EventEmitter>();
      let flushed = false;
      const flushOnce = () => {
        if (flushed) return;
        flushed = true;
        void this.telemetry.flush();
      };
      response.once("finish", flushOnce);
      response.once("close", flushOnce);
    }
    return next.handle();
  }
}
