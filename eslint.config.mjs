import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/features/**/*.ts"],
    ignores: ["src/features/**/tool.ts", "src/features/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["ai", "ai/*", "@ai-sdk/*"], message: "Feature logic must not depend on the AI SDK; only tool.ts may import it." },
            { group: ["@/agent/*", "@/app/*", "@/ai/*"], message: "Features must not depend on the agent, app or AI layers." },
          ],
        },
      ],
    },
  },
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
