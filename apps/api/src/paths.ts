import { fileURLToPath } from "node:url";

export const DATA_DIR = fileURLToPath(new URL("../data", import.meta.url));
