import { existsSync, readdirSync } from "node:fs";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const MODULES_DIR = new URL("./src/modules/", import.meta.url);
const MODULES = existsSync(MODULES_DIR) ? readdirSync(MODULES_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name) : [];

const FRAMEWORKS = ["next", "next/*", "react", "react-dom"];
const LANGCHAIN = ["langchain", "langchain/*", "@langchain/*"];
const LANGCHAIN_CHAT_MODELS = ["@langchain/openai", "@langchain/openai/*", "@langchain/anthropic", "@langchain/anthropic/*", "@langchain/google-*"];
const DEEP_MODULE_IMPORTS = ["@/modules/*/**"];
const WEB = ["@agri/web", "@agri/web/*"];

const ADAPTERS = { weather: ["WeatherRepository", "OpenMeteoClient"], rag: ["JsonRagEngine", "DocsRepository"] };
const ADAPTER_MESSAGE = "Business code receives ports through DI; concrete adapters are wired only by their Nest module or createAgentPorts().";
const RELATIVE_IMPORTS = { regex: "^\\.{1,2}/", message: "Use the @/ alias instead of relative imports." };

function adapterPaths(ownModule) {
  return Object.entries(ADAPTERS)
    .filter(([name]) => name !== ownModule)
    .map(([name, importNames]) => ({ name: `@/modules/${name}`, importNames, message: ADAPTER_MESSAGE }));
}

const DATABASE_OUTSIDE_REPOSITORIES = { name: "@/database", importNames: ["DATABASE", "LazyDatabase", "createPgPool"], message: "Only repositories query the database; services and controllers go through a repository." };
const TABLES_OUTSIDE_REPOSITORIES = { group: ["@/database/schema", "@/database/schema/*"], allowTypeImports: true, message: "Only repositories (and src/database) work with tables; everything else goes through a repository." };

function restrictedImports(message, group, paths = [], extraPatterns = []) {
  return {
    "no-restricted-imports": "off",
    "no-console": "error",
    "@typescript-eslint/no-restricted-imports": ["error", { paths, patterns: [{ group, message }, RELATIVE_IMPORTS, ...extraPatterns] }],
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
    rules: restrictedImports("apps/api has no UI frameworks and no LangChain outside modules/rag and modules/agent/workflows.", [...FRAMEWORKS, ...LANGCHAIN, ...WEB]),
  },
  {
    files: ["src/common/**/*.ts", "src/config/**/*.ts", "src/observability/**/*.ts"],
    rules: restrictedImports("common/, config/ and observability/ are cross-cutting: they never import feature modules.", [...FRAMEWORKS, ...LANGCHAIN, ...WEB, "@/modules", "@/modules/**"], [], [TABLES_OUTSIDE_REPOSITORIES]),
  },
  {
    files: ["src/database/**/*.ts"],
    rules: restrictedImports("database/ is cross-cutting: it never imports feature modules.", [...FRAMEWORKS, ...LANGCHAIN, ...WEB, "@/modules", "@/modules/**"]),
  },
  {
    files: ["src/*.ts", "src/bootstrap/**/*.ts"],
    rules: restrictedImports("Import a feature module only through its public API: @/modules/<name>.", [...FRAMEWORKS, ...LANGCHAIN, ...WEB, ...DEEP_MODULE_IMPORTS], adapterPaths(null), [TABLES_OUTSIDE_REPOSITORIES]),
  },
  ...MODULES.flatMap((name) => {
    const message = `modules/${name} may import other modules only through their public API (@/modules/<name>).`;
    const group = [...FRAMEWORKS, ...(name === "rag" ? LANGCHAIN_CHAT_MODELS : LANGCHAIN), ...WEB, ...DEEP_MODULE_IMPORTS, `!@/modules/${name}/**`];
    return [
      { files: [`src/modules/${name}/**/*.ts`], rules: restrictedImports(message, group, [...adapterPaths(name), DATABASE_OUTSIDE_REPOSITORIES], [TABLES_OUTSIDE_REPOSITORIES]) },
      { files: [`src/modules/${name}/repositories/**/*.ts`], rules: restrictedImports(message, group, adapterPaths(name)) },
    ];
  }),
  {
    files: ["src/modules/agent/tools/**/*.ts"],
    rules: restrictedImports(
      "Tools receive ports; they never build adapters or modules.",
      [...FRAMEWORKS, ...LANGCHAIN, ...WEB, ...DEEP_MODULE_IMPORTS, "!@/modules/agent/**", "@/modules/agent/core/create-agent-ports", "@/modules/agent/AgentModule"],
      [...adapterPaths("agent"), { name: "@/modules/agent", importNames: ["createAgentPorts", "AgentModule"], message: ADAPTER_MESSAGE }],
    ),
  },
  {
    files: ["src/modules/agent/workflows/**/*.ts"],
    rules: restrictedImports("LangGraph is allowed here, but never LangChain chat models: call models through the AI SDK.", [...FRAMEWORKS, ...LANGCHAIN_CHAT_MODELS, ...WEB, ...DEEP_MODULE_IMPORTS, "!@/modules/agent/**"], adapterPaths("agent")),
  },
  {
    files: ["src/modules/agent/core/create-agent-ports.ts"],
    rules: restrictedImports("createAgentPorts wires adapters for evals and scripts.", [...FRAMEWORKS, ...LANGCHAIN, ...WEB, ...DEEP_MODULE_IMPORTS, "!@/modules/agent/**"]),
  },
  { ignores: ["dist/**"] },
);
