import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
  test: {
    setupFiles: ["tests/support/setup.ts"],
    env: {
      OPEN_METEO_GEOCODING_URL: "https://geocoding-api.open-meteo.com/v1/search",
      OPEN_METEO_FORECAST_URL: "https://api.open-meteo.com/v1/forecast",
    },
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "components",
          include: ["tests/unit/ui/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["tests/support/setup-dom.ts"],
        },
      },
    ],
  },
});
