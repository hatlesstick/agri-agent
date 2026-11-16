import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export function findUp(folder: string, marker: string, start: string = HERE): string {
  let current = start;
  for (;;) {
    const candidate = join(current, folder);
    if (existsSync(join(candidate, marker))) return candidate;
    const parent = dirname(current);
    if (parent === current) throw new Error(`${folder}/${marker} not found above ${start}`);
    current = parent;
  }
}

export function findDataDir(start: string = HERE): string {
  return findUp("data", "docs", start);
}

export const DATA_DIR = findDataDir();
