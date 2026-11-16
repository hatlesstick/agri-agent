import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: { "no-irregular-whitespace": ["error", { skipRegExps: true }] },
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "react", "react-dom", "@nestjs/*", "ai/*", "@ai-sdk/*", "@agri/*"],
              message: "@agri/shared is cross-cutting: no frameworks, no AI SDK, no other workspace package.",
            },
          ],
          paths: [{ name: "ai", allowTypeImports: true, message: "@agri/shared may import only types from ai." }],
        },
      ],
    },
  },
  { ignores: ["dist/**"] },
);
