import { existsSync, readdirSync } from "node:fs";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const FRAMEWORKS = ["next", "next/*", "react", "react-dom"];
const LANGCHAIN = ["langchain", "langchain/*", "@langchain/*"];
const LANGCHAIN_CHAT_MODELS = ["@langchain/openai", "@langchain/openai/*", "@langchain/anthropic", "@langchain/anthropic/*", "@langchain/google-*"];

const MODULES_DIR = new URL("./src/modules/", import.meta.url);
const MODULES = existsSync(MODULES_DIR) ? readdirSync(MODULES_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name) : [];
const DEEP_MODULE_IMPORTS = ["@/modules/*/**"];

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
    rules: restrictedImports("apps/api has no UI frameworks; LangChain only in modules/rag and modules/agent/graphs, never its chat models.", [...FRAMEWORKS, ...LANGCHAIN, "@agri/web", "@agri/web/*"]),
  },
  {
    files: ["src/common/**/*.ts", "src/config/**/*.ts", "src/observability/**/*.ts"],
    rules: restrictedImports("common/, config/ and observability/ are cross-cutting: they never import feature modules.", [...FRAMEWORKS, ...LANGCHAIN, "@/modules/*", "@/modules", "**/modules/**"]),
  },
  {
    files: ["src/*.ts"],
    rules: restrictedImports("Import a feature module only through its public API: @/modules/<name>.", [...FRAMEWORKS, ...LANGCHAIN, ...DEEP_MODULE_IMPORTS]),
  },
  ...MODULES.map((name) => ({
    files: [`src/modules/${name}/**/*.ts`],
    rules: restrictedImports(
      `modules/${name} may import other modules only through their public API (@/modules/<name>).`,
      [...FRAMEWORKS, ...(name === "rag" ? LANGCHAIN_CHAT_MODELS : LANGCHAIN), ...DEEP_MODULE_IMPORTS, `!@/modules/${name}/**`, "@agri/web", "@agri/web/*"],
    ),
  })),
  {
    files: ["src/modules/agent/graphs/**/*.ts"],
    rules: restrictedImports("LangGraph is allowed here, but never LangChain chat models: call models through the AI SDK.", [...FRAMEWORKS, ...LANGCHAIN_CHAT_MODELS, ...DEEP_MODULE_IMPORTS, "!@/modules/agent/**"]),
  },
  { ignores: ["dist/**"] },
);
