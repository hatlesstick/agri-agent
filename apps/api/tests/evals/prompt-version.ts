import { execSync } from "node:child_process";

export function promptVersion(): string {
  try {
    return execSync("git log -1 --format=%h -- src/modules/agent/instructions.ts", { encoding: "utf8" }).trim() || "uncommitted";
  } catch {
    return "unknown";
  }
}
