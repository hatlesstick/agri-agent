import { describe, expect, it, beforeEach } from "vitest";
import { MemoryDocChunkStore } from "@/modules/rag/adapters/MemoryDocChunkStore";
import { ingestDocuments, planIngest, removeDocumentsNotIn, type DocumentEmbedder } from "@/modules/rag/ingest/ingest-documents";

const SHARED_SOURCE = "FAO (2001), Guidelines on good practice";

const SPRAY = `# Spray drift

Source: ${SHARED_SOURCE}
Updated: 2026-11-25

## Wind

Wind above 4 m/s raises drift.

## Nozzles

Use coarse droplets.`;

const WEATHER = `# Weather for spraying

Source: ${SHARED_SOURCE}
Updated: 2026-11-25

## Wind

Check wind before you start.`;

const INVALID = "# No source here\n\nUpdated: 2026-11-25\n\n## S\n\ntext";

class CountingEmbedder implements DocumentEmbedder {
  calls: string[][] = [];

  async embedDocuments(documents: string[]): Promise<number[][]> {
    this.calls.push(documents);
    return documents.map((text) => [text.length, 1, 0, 0]);
  }
}

class FailingEmbedder implements DocumentEmbedder {
  async embedDocuments(): Promise<number[][]> {
    throw new Error("provider down");
  }
}

describe("ingestDocuments", () => {
  let store: MemoryDocChunkStore;
  let embedder: CountingEmbedder;

  beforeEach(() => {
    store = new MemoryDocChunkStore();
    embedder = new CountingEmbedder();
  });

  it("adds every chunk of every valid document on the first run", async () => {
    const report = await ingestDocuments([{ fileName: "spray.md", markdown: SPRAY }], store, embedder);
    expect(report).toEqual({ added: 2, unchanged: 0, rejected: [] });
    expect(embedder.calls).toEqual([["Spray drift — Wind\n\nWind above 4 m/s raises drift.", "Spray drift — Nozzles\n\nUse coarse droplets."]]);
  });

  it("writes nothing and embeds nothing when the same documents are ingested again", async () => {
    await ingestDocuments([{ fileName: "spray.md", markdown: SPRAY }], store, embedder);
    embedder.calls = [];
    const report = await ingestDocuments([{ fileName: "spray.md", markdown: SPRAY }], store, embedder);
    expect(report).toEqual({ added: 0, unchanged: 2, rejected: [] });
    expect(embedder.calls).toEqual([]);
  });

  it("treats a formatting-only change as unchanged, because cleaning runs before hashing", async () => {
    await ingestDocuments([{ fileName: "spray.md", markdown: SPRAY }], store, embedder);
    const messy = SPRAY.replace("Wind above", "Wind   above").replace(/\n\n## Nozzles/, "\n\n\n\n## Nozzles") + "\n\n";
    const report = await ingestDocuments([{ fileName: "spray.md", markdown: messy }], store, embedder);
    expect(report).toEqual({ added: 0, unchanged: 2, rejected: [] });
  });

  it("re-embeds only the changed section and removes its old version", async () => {
    await ingestDocuments([{ fileName: "spray.md", markdown: SPRAY }], store, embedder);
    const edited = SPRAY.replace("Wind above 4 m/s raises drift.", "Wind above 3 m/s raises drift.");
    const report = await ingestDocuments([{ fileName: "spray.md", markdown: edited }], store, embedder);
    expect(report).toEqual({ added: 1, unchanged: 1, rejected: [] });
    expect(embedder.calls.at(-1)).toEqual(["Spray drift — Wind\n\nWind above 3 m/s raises drift."]);
    const texts = (await store.search([1, 0, 0, 0], 10)).map((match) => match.chunk.text).sort();
    expect(texts).toEqual(["Spray drift — Nozzles\n\nUse coarse droplets.", "Spray drift — Wind\n\nWind above 3 m/s raises drift."]);
  });

  it("rejects an invalid document with its reason and still ingests the others", async () => {
    const report = await ingestDocuments(
      [
        { fileName: "bad.md", markdown: INVALID },
        { fileName: "spray.md", markdown: SPRAY },
      ],
      store,
      embedder,
    );
    expect(report).toEqual({ added: 2, unchanged: 0, rejected: [{ fileName: "bad.md", error: "missing_source" }] });
  });

  it("does not delete another document that cites the same source", async () => {
    await ingestDocuments(
      [
        { fileName: "spray.md", markdown: SPRAY },
        { fileName: "weather.md", markdown: WEATHER },
      ],
      store,
      embedder,
    );
    await ingestDocuments([{ fileName: "spray.md", markdown: SPRAY.replace("Use coarse droplets.", "Use coarse droplets and low pressure.") }], store, embedder);
    const weather = (await store.search([0, 1, 0, 0], 10)).filter((match) => match.chunk.id.startsWith("weather.md#"));
    expect(weather.map((match) => match.chunk.text)).toEqual(["Weather for spraying — Wind\n\nCheck wind before you start."]);
  });

  it("when embedding fails, reports the document and keeps its previously stored chunks", async () => {
    await ingestDocuments([{ fileName: "spray.md", markdown: SPRAY }], store, embedder);
    const report = await ingestDocuments(
      [{ fileName: "spray.md", markdown: SPRAY.replace("Use coarse droplets.", "Use fine droplets.") }],
      store,
      new FailingEmbedder(),
    );
    expect(report).toEqual({ added: 0, unchanged: 0, rejected: [{ fileName: "spray.md", error: "embedding_failed" }] });
    const texts = (await store.search([1, 0, 0, 0], 10)).map((match) => match.chunk.text);
    expect(texts).toContain("Spray drift — Nozzles\n\nUse coarse droplets.");
  });
});

describe("planIngest and removeDocumentsNotIn", () => {
  it("reports what a run would add, keep and remove without embedding or writing", async () => {
    const store = new MemoryDocChunkStore();
    const embedder = new CountingEmbedder();
    await ingestDocuments([{ fileName: "spray.md", markdown: SPRAY }, { fileName: "old.md", markdown: WEATHER }], store, embedder);
    embedder.calls = [];
    const plan = await planIngest([{ fileName: "spray.md", markdown: SPRAY.replace("Use coarse droplets.", "Use fine droplets.") }, { fileName: "bad.md", markdown: INVALID }], store);
    expect(plan).toEqual({ wouldAdd: 1, unchanged: 1, wouldRemove: ["old.md"], rejected: [{ fileName: "bad.md", error: "missing_source" }] });
    expect(embedder.calls).toEqual([]);
    expect((await store.documentKeys()).sort()).toEqual(["old.md", "spray.md"]);
  });

  it("removes every stored document that is no longer in the corpus and keeps the rest", async () => {
    const store = new MemoryDocChunkStore();
    await ingestDocuments([{ fileName: "spray.md", markdown: SPRAY }, { fileName: "old.md", markdown: WEATHER }], store, new CountingEmbedder());
    const removed = await removeDocumentsNotIn(["spray.md"], store);
    expect(removed).toBe(1);
    expect(await store.documentKeys()).toEqual(["spray.md"]);
  });
});
