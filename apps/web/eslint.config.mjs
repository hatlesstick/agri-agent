import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const FRAMEWORKS = ["next", "next/*", "react", "react-dom"];
const ATOMIC_LEVELS = ["atoms", "molecules", "organisms", "templates", "pages"];
const DEEP_PACKAGE_IMPORTS = ["@agri/agent/*", "@agri/shared/*", "!@agri/shared/server-env"];

const BOUNDARIES = [
  {
    files: ["src/server/services/**"],
    message: "server/services hold business logic: use helpers, guardrails, @agri/shared and @agri/agent (public API), never controllers or frameworks.",
    forbidden: [...FRAMEWORKS, ...DEEP_PACKAGE_IMPORTS, "@/server/controllers/*", "@/ui/*", "@/app/*"],
  },
  {
    files: ["src/server/controllers/**"],
    message: "server/controllers handle HTTP only: delegate to services; use @agri/agent through its public API.",
    forbidden: ["react", "react-dom", ...DEEP_PACKAGE_IMPORTS, "@/ui/*", "@/app/*"],
  },
  {
    files: ["src/server/guardrails/**", "src/server/helpers/**"],
    message: "server/guardrails and server/helpers are leaf utilities: no controllers, services or UI.",
    forbidden: ["react", "react-dom", ...DEEP_PACKAGE_IMPORTS, "@/server/controllers/*", "@/server/services/*", "@/ui/*", "@/app/*"],
  },
  {
    files: ["src/ui/**"],
    message: "ui/ uses @agri/agent for types only (import type), @agri/shared and its own folders.",
    forbidden: ["@agri/agent/*", "@agri/shared/*", "@/server/*", "@/app/*"],
    typeOnly: ["@agri/agent"],
  },
  {
    files: ["src/app/**"],
    message: "app/ only wires routes: @/ui/pages/* for pages and @/server/controllers/* for API routes.",
    forbidden: ["@agri/agent", "@agri/agent/*", "@agri/shared", "@agri/shared/*", "@/server/services/*", "@/server/guardrails/*", "@/server/helpers/*", "@/ui/atoms/*", "@/ui/molecules/*", "@/ui/organisms/*", "@/ui/templates/*", "@/ui/hooks/*", "@/ui/helpers/*", "@/ui/schemas/*"],
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
