import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AGRI_DATA_DIR: "../../packages/agent/data",
  },
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  outputFileTracingIncludes: {
    "/api/**": ["../../packages/agent/data/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
