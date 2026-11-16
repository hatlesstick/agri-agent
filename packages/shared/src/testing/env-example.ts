import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RUNTIME_ONLY_KEYS = new Set(["NODE_ENV", "NEXT_RUNTIME", "CI_OFFLINE", "EVAL_COMPARE", "EVAL_RUN_ID"]);
const SECRET_KEY = /(_KEY|_SECRET|_TOKEN|_PASSWORD)$/;
const SOURCE_FILE = /\.(ts|tsx|mts|mjs)$/;
const ENV_READ = /process\.env\.([A-Z][A-Z0-9_]*)/g;

export type EnvExampleOptions = {
  root: string;
  requiredKeys: readonly string[];
  sourceDirs: string[];
};

export type EnvExampleFindings = {
  missingRequired: string[];
  missingReadInCode: string[];
  filledSecrets: string[];
};

function exampleEntries(root: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of readFileSync(join(root, ".env.example"), "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) entries.set(match[1], match[2]);
  }
  return entries;
}

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && SOURCE_FILE.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

function envKeysReadInCode(root: string, sourceDirs: string[]): string[] {
  const keys = new Set<string>();
  for (const file of sourceDirs.flatMap((directory) => sourceFiles(join(root, directory)))) {
    for (const match of readFileSync(file, "utf8").matchAll(ENV_READ)) keys.add(match[1]);
  }
  return [...keys].sort();
}

export function envExampleFindings({ root, requiredKeys, sourceDirs }: EnvExampleOptions): EnvExampleFindings {
  const entries = exampleEntries(root);
  const missing = (key: string) => !RUNTIME_ONLY_KEYS.has(key) && !entries.has(key);
  return {
    missingRequired: requiredKeys.filter(missing),
    missingReadInCode: envKeysReadInCode(root, sourceDirs).filter(missing),
    filledSecrets: [...entries].filter(([key, value]) => SECRET_KEY.test(key) && value.trim() !== "").map(([key]) => key),
  };
}
