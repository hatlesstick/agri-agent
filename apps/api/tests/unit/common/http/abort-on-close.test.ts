import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it } from "vitest";
import { abortOnClose } from "@/common/http";

function exchange() {
  const req = new EventEmitter() as IncomingMessage;
  const res = Object.assign(new EventEmitter(), { writableFinished: false }) as unknown as ServerResponse & { writableFinished: boolean };
  return { req, res };
}

describe("abortOnClose", () => {
  it("aborts when the client disconnects before the response finished", () => {
    const { req, res } = exchange();
    const signal = abortOnClose(req, res);
    res.emit("close");
    expect(signal.aborted).toBe(true);
  });

  it("does not abort after a normal finish", () => {
    const { req, res } = exchange();
    const signal = abortOnClose(req, res);
    res.writableFinished = true;
    res.emit("finish");
    res.emit("close");
    expect(signal.aborted).toBe(false);
  });
});
