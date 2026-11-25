import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "@/config";

export const DOCS_DIR = join(DATA_DIR, "docs");

export class DocsRepository {
  readCorpusDocuments(): Array<{ fileName: string; markdown: string }> {
    return readdirSync(DOCS_DIR)
      .filter((file) => file.endsWith(".md"))
      .sort()
      .map((fileName) => ({ fileName, markdown: readFileSync(join(DOCS_DIR, fileName), "utf8") }));
  }
}

