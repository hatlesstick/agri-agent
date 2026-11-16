import type { IncomingMessage, ServerResponse } from "node:http";

export function abortOnClose(_req: IncomingMessage, res: ServerResponse): AbortSignal {
  const controller = new AbortController();
  if (res.destroyed && !res.writableFinished) {
    controller.abort();
    return controller.signal;
  }
  res.once("close", () => {
    if (!res.writableFinished) controller.abort();
  });
  return controller.signal;
}
