import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "@/config";
import { chunkMarkdown } from "@/modules/rag/domain/chunk-markdown";
import type { Chunk, RagIndex } from "@/modules/rag/rag.types";

export const DOCS_DIR = join(DATA_DIR, "docs");
export const INDEX_FILE = join(DATA_DIR, "index.json");

export class DocsRepository {
  readCorpusChunks(): Chunk[] {
    return readdirSync(DOCS_DIR)
      .filter((file) => file.endsWith(".md"))
      .sort()
      .flatMap((file) => chunkMarkdown(file, readFileSync(join(DOCS_DIR, file), "utf8")));
  }

  readIndex(): RagIndex | null {
    return existsSync(INDEX_FILE) ? (JSON.parse(readFileSync(INDEX_FILE, "utf8")) as RagIndex) : null;
  }
}

