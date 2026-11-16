import { execSync } from "node:child_process";

export const INSTRUCTIONS_PATH = "src/modules/agent/core/instructions.ts";

export function promptVersion(): string {
  try {
    return execSync(`git log -1 --format=%h -- ${INSTRUCTIONS_PATH}`, { encoding: "utf8" }).trim() || "uncommitted";
  } catch {
    return "unknown";
  }
}
