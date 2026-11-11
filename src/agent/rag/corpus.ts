import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chunkMarkdown } from "@/domain/rag/chunk";
import type { Chunk } from "@/domain/rag/types";

export const DOCS_DIR = join(process.cwd(), "data", "docs");
export const INDEX_FILE = join(process.cwd(), "data", "index.json");

export function readCorpusChunks(dir: string = DOCS_DIR): Chunk[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .flatMap((file) => chunkMarkdown(file, readFileSync(join(dir, file), "utf8")));
}
