import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function findDataDir(start: string): string {
  let current = start;
  for (;;) {
    const candidate = join(current, "data");
    if (existsSync(join(candidate, "docs"))) return candidate;
    const parent = dirname(current);
    if (parent === current) throw new Error(`RAG data directory not found above ${start}`);
    current = parent;
  }
}

export const DATA_DIR = findDataDir(dirname(fileURLToPath(import.meta.url)));
