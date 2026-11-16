import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chunkMarkdown } from "@/server/repositories/docs/chunk-markdown";
import type { Chunk, RagIndex } from "@/server/repositories/docs/docs.types";

export const DOCS_DIR = join(process.cwd(), "data", "docs");
export const INDEX_FILE = join(process.cwd(), "data", "index.json");

export class DocsRepository {
  readCorpusChunks(): Chunk[] {
    return readdirSync(join(process.cwd(), "data", "docs"))
      .filter((file) => file.endsWith(".md"))
      .sort()
      .flatMap((file) => chunkMarkdown(file, readFileSync(join(process.cwd(), "data", "docs", file), "utf8")));
  }

  readIndex(): RagIndex | null {
    return existsSync(INDEX_FILE) ? (JSON.parse(readFileSync(INDEX_FILE, "utf8")) as RagIndex) : null;
  }
}

export const docsRepository = new DocsRepository();
