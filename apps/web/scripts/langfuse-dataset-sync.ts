import { SPRAY_CHECK_DATASET, sprayCheckDatasetItems } from "@tests/evals/experiment";
import { requireLangfuseClient } from "@tests/evals/langfuse-client";

const DESCRIPTION = "Spray-check questions with fixed weather scenarios and the rule-based expected decision.";

async function main(): Promise<void> {
  const langfuse = requireLangfuseClient();

  try {
    await langfuse.api.datasets.get(SPRAY_CHECK_DATASET);
  } catch {
    await langfuse.api.datasets.create({ name: SPRAY_CHECK_DATASET, description: DESCRIPTION });
    console.log(`created dataset ${SPRAY_CHECK_DATASET}`);
  }

  const items = sprayCheckDatasetItems();
  for (const item of items) {
    await langfuse.api.datasetItems.create({ datasetName: SPRAY_CHECK_DATASET, ...item });
  }
  console.log(`upserted ${items.length} items into ${SPRAY_CHECK_DATASET}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
