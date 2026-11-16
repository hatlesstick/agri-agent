import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const FRAMEWORKS = ["next", "next/*", "react", "react-dom", "@nestjs/*"];
const AI_SDK = ["ai", "ai/*", "@ai-sdk/*"];
const AGENT_MODULES = ["@/tools/*", "@/rag/*", "@/spray-check/*", "@/guardrails/*", "@/mock/*", "@/agent", "@/model", "@/telemetry", "@/instructions", "@/index"];

function restrictedImports(message, group) {
  return {
    "no-restricted-imports": "off",
    "@typescript-eslint/no-restricted-imports": ["error", { patterns: [{ group, message }] }],
  };
}

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: { "no-irregular-whitespace": ["error", { skipRegExps: true }] },
  },
  {
    files: ["src/**/*.ts"],
    rules: restrictedImports("@agri/agent is framework-free: no Next.js, React, Nest or app code.", [...FRAMEWORKS, "@agri/web", "@agri/web/*", "@agri/shared/testing"]),
  },
  {
    files: ["src/weather/**/*.ts", "src/docs/**/*.ts"],
    rules: restrictedImports("weather/ and docs/ are data access: no AI SDK, agent modules or rules.", [...FRAMEWORKS, ...AI_SDK, ...AGENT_MODULES, "@/spray-window/*", "@agri/shared/testing"]),
  },
  {
    files: ["src/spray-window/**/*.ts"],
    rules: restrictedImports("spray-window/ holds deterministic rules: it may use weather/ only.", [...FRAMEWORKS, ...AI_SDK, ...AGENT_MODULES, "@/docs/*", "@agri/shared/testing"]),
  },
  { ignores: ["dist/**"] },
);
