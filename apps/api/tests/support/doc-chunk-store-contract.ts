import { beforeEach, afterAll, describe, expect, it } from "vitest";
import type { DocChunkStore, StoredChunk } from "@/modules/rag/doc-chunk-store.types";
import { contentHash } from "@/modules/rag/domain/content-hash";

const DIMENSIONS = 1536;

function vec(...values: number[]): number[] {
  return [...values, ...new Array<number>(DIMENSIONS - values.length).fill(0)];
}

export type StoreUnderTest = { store: DocChunkStore; reset(): Promise<void>; close(): Promise<void> };

function chunk(source: string, heading: string, text: string, embedding: number[]): StoredChunk {
  return {
    id: `${source}#${heading.toLowerCase().replace(/\s+/g, "-")}`,
    source,
    title: `${source} title`,
    heading,
    text,
    updatedAt: "2026-11-25",
    contentHash: contentHash(text),
    embedding,
  };
}

export function describeDocChunkStore(name: string, create: () => Promise<StoreUnderTest>): void {
  describe(`${name} (DocChunkStore contract)`, () => {
    let under: StoreUnderTest;

    beforeEach(async () => {
      under ??= await create();
      await under.reset();
    });

    afterAll(async () => {
      await under?.close();
    });

    const near = chunk("spray-drift.md", "Wind", "Wind speed raises drift.", vec(1, 0, 0));
    const far = chunk("spray-drift.md", "Nozzles", "Use coarse droplets.", vec(0, 1, 0));
    const other = chunk("rainfastness.md", "Rain", "Wait for dry leaves.", vec(0.9, 0.1, 0));

    it("inserts new chunks and reports how many were written", async () => {
      expect(await under.store.upsertMany([near, far])).toBe(2);
    });

    it("skips chunks whose content hash already exists, so a repeat run writes nothing", async () => {
      await under.store.upsertMany([near, far]);
      expect(await under.store.upsertMany([near, far])).toBe(0);
    });

    it("reports which content hashes are already stored", async () => {
      await under.store.upsertMany([near]);
      const found = await under.store.existingHashes([near.contentHash, far.contentHash]);
      expect([...found]).toEqual([near.contentHash]);
    });

    it("returns the nearest chunks first, with their fields and a cosine score", async () => {
      await under.store.upsertMany([far, near, other]);
      const matches = await under.store.search(vec(1, 0, 0), 2);
      expect(matches.map((match) => match.chunk.id)).toEqual([near.id, other.id]);
      expect(matches[0].chunk).toEqual({
        id: near.id,
        source: near.source,
        title: near.title,
        heading: near.heading,
        text: near.text,
        updatedAt: near.updatedAt,
      });
      expect(matches[0].score).toBeCloseTo(1, 5);
      expect(matches[0].score).toBeGreaterThan(matches[1].score);
    });

    it("returns every stored chunk when topK is larger than the store", async () => {
      await under.store.upsertMany([near, far]);
      expect(await under.store.search(vec(0, 1, 0), 10)).toHaveLength(2);
    });

    it("prunes only the given document, keeping the listed hashes", async () => {
      await under.store.upsertMany([near, far, other]);
      expect(await under.store.pruneDocument("spray-drift.md", [near.contentHash])).toBe(1);
      const remaining = await under.store.search(vec(0.5, 0.5, 0), 10);
      expect(remaining.map((match) => match.chunk.id).sort()).toEqual([near.id, other.id].sort());
    });

    it("does not prune another document that shares the same source citation", async () => {
      const shared = "FAO (2001), Guidelines on good practice";
      const first = { ...chunk("spray-drift.md", "Wind", "Wind matters.", vec(1, 0, 0)), source: shared };
      const second = { ...chunk("weather.md", "Wind", "Wind matters too.", vec(0, 1, 0)), source: shared };
      await under.store.upsertMany([first, second]);
      expect(await under.store.pruneDocument("spray-drift.md", [])).toBe(1);
      const left = await under.store.search(vec(0, 1, 0), 10);
      expect(left.map((match) => match.chunk.id)).toEqual([second.id]);
    });

    it("lists each document that has stored chunks once", async () => {
      await under.store.upsertMany([near, far, other]);
      expect((await under.store.documentKeys()).sort()).toEqual(["rainfastness.md", "spray-drift.md"]);
    });

    it("a changed chunk is a new row, and pruning removes the old version", async () => {
      await under.store.upsertMany([near]);
      const changed = chunk("spray-drift.md", "Wind", "Wind speed above 4 m/s raises drift.", vec(1, 0, 0));
      expect(await under.store.upsertMany([changed])).toBe(1);
      expect(await under.store.pruneDocument("spray-drift.md", [changed.contentHash])).toBe(1);
      const matches = await under.store.search(vec(1, 0, 0), 10);
      expect(matches.map((match) => match.chunk.text)).toEqual([changed.text]);
    });
  });
}
