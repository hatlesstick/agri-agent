import { describe, expect, it } from "vitest";
import { evalTags } from "@/agent/evals/tags";

describe("evalTags", () => {
  it("returns no tags when the variable is missing or empty", () => {
    expect(evalTags(undefined)).toEqual([]);
    expect(evalTags("")).toEqual([]);
    expect(evalTags(" , ")).toEqual([]);
  });

  it("splits comma-separated tags, trims them and removes duplicates", () => {
    expect(evalTags("ci, nightly,ci")).toEqual(["ci", "nightly"]);
  });

  it("rejects tags that are not short lowercase slugs", () => {
    expect(() => evalTags("ci,Bad Tag")).toThrow('Invalid EVAL_TAGS entry: "Bad Tag"');
    expect(() => evalTags("x".repeat(41))).toThrow("Invalid EVAL_TAGS entry");
  });
});
