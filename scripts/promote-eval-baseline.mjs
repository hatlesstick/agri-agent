import { cpSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const resultsDir = join(process.cwd(), ".evals", "results");
const baselinesDir = join(process.cwd(), "src", "agent", "evals", "baselines");

const runs = existsSync(resultsDir) ? readdirSync(resultsDir).sort() : [];
const runId = process.argv[2] ?? runs.at(-1);

if (!runId || !existsSync(join(resultsDir, runId))) {
  console.error("No eval results found. Run npm run eval or npm run eval:real first.");
  process.exit(1);
}

for (const model of readdirSync(join(resultsDir, runId))) {
  cpSync(join(resultsDir, runId, model), join(baselinesDir, model), { recursive: true });
  console.log(`baseline updated: ${model} ← ${runId}`);
}
