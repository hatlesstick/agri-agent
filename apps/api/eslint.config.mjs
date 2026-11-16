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

function restrictedImports(message, group, paths = []) {
  return {
    "no-restricted-imports": "off",
    "@typescript-eslint/no-restricted-imports": ["error", { paths, patterns: [{ group, message }] }],
  };
}

const ADAPTER_MESSAGE = "Tools receive ports; concrete adapters are wired by Nest modules or createAgentPorts().";
const TOOL_FORBIDDEN_NAMES = [
  { name: "@/modules/weather", importNames: ["WeatherRepository", "OpenMeteoClient", "WeatherModule"], message: ADAPTER_MESSAGE },
  { name: "@/modules/rag", importNames: ["JsonRagEngine", "DocsRepository", "RagModule"], message: ADAPTER_MESSAGE },
  { name: "@/modules/agent", importNames: ["createAgentPorts", "AgentModule"], message: ADAPTER_MESSAGE },
];

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: { "no-irregular-whitespace": ["error", { skipRegExps: true }] },
  },
  {
    files: ["src/**/*.ts"],
    rules: restrictedImports("apps/api has no UI frameworks; LangChain only in modules/rag and modules/agent/workflows, never its chat models.", [...FRAMEWORKS, ...LANGCHAIN, "@agri/web", "@agri/web/*"]),
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
    files: ["src/modules/agent/tools/**/*.ts"],
    rules: restrictedImports(ADAPTER_MESSAGE, [...FRAMEWORKS, ...LANGCHAIN, ...DEEP_MODULE_IMPORTS, "!@/modules/agent/**", "@/modules/agent/core/create-agent-ports", "@/modules/agent/AgentModule", "@agri/web", "@agri/web/*"], TOOL_FORBIDDEN_NAMES),
  },
  {
    files: ["src/modules/agent/workflows/**/*.ts"],
    rules: restrictedImports("LangGraph is allowed here, but never LangChain chat models: call models through the AI SDK.", [...FRAMEWORKS, ...LANGCHAIN_CHAT_MODELS, ...DEEP_MODULE_IMPORTS, "!@/modules/agent/**"]),
  },
  { ignores: ["dist/**"] },
);
