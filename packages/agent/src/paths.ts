import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_DATA_DIR = fileURLToPath(new URL("../data", import.meta.url));

export function resolveDataDir(override: string | undefined): string {
  return override ? resolve(override) : PACKAGE_DATA_DIR;
}

export const DATA_DIR = resolveDataDir(process.env.AGRI_DATA_DIR);
