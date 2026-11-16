import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const ATOMIC_LEVELS = ["atoms", "molecules", "organisms", "templates", "pages"];

const BOUNDARIES = [
  {
    files: ["src/ui/**"],
    message: "ui/ uses @agri/shared (contracts and limits) and its own folders; never backend code.",
    forbidden: ["@agri/agent", "@agri/agent/*", "@agri/api", "@agri/api/*", "@agri/shared/*", "!@agri/shared/contracts", "@/app/*", "@/proxy"],
  },
  {
    files: ["src/app/**"],
    message: "app/ only wires pages: @/ui/pages/*.",
    forbidden: ["@agri/*", "@/ui/atoms/*", "@/ui/molecules/*", "@/ui/organisms/*", "@/ui/templates/*", "@/ui/hooks/*", "@/ui/helpers/*", "@/ui/schemas/*"],
  },
  {
    files: ["src/proxy.ts"],
    message: "proxy.ts only adds proxy headers; no UI or backend code.",
    forbidden: ["@agri/*", "@/ui/*", "@/app/*"],
  },
];

function restrictedImports({ message, forbidden, typeOnly = [] }, extraPatterns = []) {
  return {
    "no-restricted-imports": "off",
    "@typescript-eslint/no-restricted-imports": [
      "error",
      {
        paths: typeOnly.map((name) => ({ name, allowTypeImports: true, message })),
        patterns: [{ group: [...new Set(forbidden)], message }, ...extraPatterns],
      },
    ],
  };
}

const UI = BOUNDARIES.find(({ files }) => files[0] === "src/ui/**");

function layerRules() {
  const layers = BOUNDARIES.map((boundary) => ({ files: boundary.files.map((glob) => `${glob}/*.{ts,tsx}`), rules: restrictedImports(boundary) }));
  const atomic = ATOMIC_LEVELS.slice(0, -1).map((level, index) => ({
    files: [`src/ui/${level}/**/*.{ts,tsx}`],
    rules: restrictedImports(UI, [
      {
        group: ATOMIC_LEVELS.slice(index + 1).map((higher) => `@/ui/${higher}/*`),
        message: `ui/${level} may only use lower atomic levels (atoms ← molecules ← organisms ← templates ← pages).`,
      },
    ]),
  }));
  const foundations = {
    files: ["src/ui/helpers/**/*.{ts,tsx}", "src/ui/hooks/**/*.{ts,tsx}", "src/ui/schemas/**/*.{ts,tsx}"],
    rules: restrictedImports(UI, [
      { group: ATOMIC_LEVELS.map((level) => `@/ui/${level}/*`), message: "ui/helpers, ui/hooks and ui/schemas must not import components." },
    ]),
  };
  return [...layers, ...atomic, foundations];
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...layerRules(),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
