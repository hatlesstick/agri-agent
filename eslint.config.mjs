import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...[
    {
      layer: "domain",
      message: "domain/ is pure business logic: no AI SDK, Next.js, agent, server or app imports.",
      forbidden: ["ai", "ai/*", "@ai-sdk/*", "next", "next/*", "@/agent", "@/agent/*", "@/server/*", "@/app/*"],
    },
    {
      layer: "agent",
      message: "agent/ must stay framework-agnostic: no Next.js, server or app imports.",
      forbidden: ["next", "next/*", "@/server/*", "@/app/*"],
    },
    {
      layer: "server",
      message: "server/ uses the agent only through its public API (@/agent) and never imports app/.",
      forbidden: ["@/agent/*", "@/app/*", "@/domain/*"],
    },
    {
      layer: "app",
      message: "app/ is UI and route wiring: use @/server for handlers and @/agent for types only.",
      forbidden: ["@/agent/*", "@/domain/*", "@/server/guardrails/*"],
    },
  ].map(({ layer, message, forbidden }) => ({
    files: [`src/${layer}/**/*.{ts,tsx}`],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: forbidden, message }] }],
    },
  })),
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
