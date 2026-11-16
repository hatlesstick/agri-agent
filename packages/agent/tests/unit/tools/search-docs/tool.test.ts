import { afterEach, describe, expect, it, vi } from "vitest";
import { runSearchDocs } from "@/tools/search-docs/tool";
import { fakeRag } from "@tests/support/fake-ports";

describe("runSearchDocs", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns search_unavailable when the engine throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await runSearchDocs({ query: "spray drift" }, { rag: fakeRag(new Error("boom")) })).toEqual({ error: "search_unavailable" });
  });

  it("returns search_unavailable when the engine has no usable index", async () => {
    expect(await runSearchDocs({ query: "spray drift" }, { rag: fakeRag(null) })).toEqual({ error: "search_unavailable" });
  });

  it("returns the hits that pass the threshold", async () => {
    const hits = [{ id: "a", source: "FAO", title: "Drift", heading: "Wind", text: "Wind and droplets.", score: 0.9 }];
    expect(await runSearchDocs({ query: "spray drift" }, { rag: fakeRag(hits) })).toEqual({ hits });
  });
});
