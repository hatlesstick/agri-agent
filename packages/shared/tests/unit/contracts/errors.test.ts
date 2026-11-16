import { describe, expect, it } from "vitest";
import { problemDetailsSchema } from "@/contracts/errors";

const problem = { type: "about:blank", title: "Too Many Requests", status: 429, instance: "req-1", code: "rate_limited" };

describe("problemDetailsSchema", () => {
  it("accepts an RFC 9457 problem with a known code", () => {
    expect(problemDetailsSchema.safeParse(problem).success).toBe(true);
  });

  it("rejects unknown codes and non-error statuses", () => {
    expect(problemDetailsSchema.safeParse({ ...problem, code: "teapot" }).success).toBe(false);
    expect(problemDetailsSchema.safeParse({ ...problem, status: 200 }).success).toBe(false);
  });
});
