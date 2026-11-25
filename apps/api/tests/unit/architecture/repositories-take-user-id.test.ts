import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "../../../src");

function repositoryFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return repositoryFiles(path);
    return path.endsWith("Repository.ts") && path.includes("/repositories/") ? [path] : [];
  });
}

const SHARED_CORPUS_REPOSITORIES = ["/modules/rag/repositories/DocChunksRepository.ts"];

const METHOD = /^ {2}(?:async\s+)?(\w+)\(([^)]*)\)/gm;

export function userScopeViolations(file: string, source: string): string[] {
  const violations: string[] = [];
  for (const match of source.matchAll(METHOD)) {
    const [, name, params] = match;
    if (name === "constructor") continue;
    const first = params.split(",")[0]?.trim() ?? "";
    if (!first.startsWith("userId: string")) violations.push(`${file}: ${name}(${params.trim()})`);
  }
  return violations;
}

describe("repository user scope", () => {
  it("every public repository method outside identity takes userId first", () => {
    const files = repositoryFiles(SRC).filter((file) => !file.includes("/modules/identity/") && !SHARED_CORPUS_REPOSITORIES.some((shared) => file.endsWith(shared)));
    expect(files.length).toBeGreaterThan(0);
    const violations = files.flatMap((file) => userScopeViolations(relative(SRC, file), readFileSync(file, "utf8")));
    expect(violations).toEqual([]);
  });

  it("reports a repository method whose first parameter is not userId", () => {
    const fixture = ["export class FixtureRepository {", "  constructor(private readonly database: unknown) {}", "  list(fieldId: string) {", "    return fieldId;", "  }", "}"].join("\n");
    expect(userScopeViolations("fixture/FixtureRepository.ts", fixture)).toEqual(["fixture/FixtureRepository.ts: list(fieldId: string)"]);
  });

  it("accepts a method that takes userId first", () => {
    const fixture = "export class OkRepository {\n  async getById(userId: string, id: string) {\n    return [userId, id];\n  }\n}";
    expect(userScopeViolations("fixture/OkRepository.ts", fixture)).toEqual([]);
  });
});
