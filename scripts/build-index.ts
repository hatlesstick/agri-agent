import { writeFileSync } from "node:fs";
import { embedMany } from "ai";
import { EMBEDDING_MODEL } from "@/agent/model";
import { INDEX_FILE, readCorpusChunks } from "@/agent/rag/corpus";
import type { RagIndex } from "@/domain/rag/types";

async function main(): Promise<void> {
  const chunks = readCorpusChunks();
  const { embeddings, usage } = await embedMany({
    model: EMBEDDING_MODEL,
    values: chunks.map((chunk) => chunk.text),
    maxRetries: 3,
  });

  const index: RagIndex = {
    model: EMBEDDING_MODEL,
    createdAt: new Date().toISOString(),
    chunks: chunks.map((chunk, position) => ({ ...chunk, embedding: embeddings[position] })),
  };

  writeFileSync(INDEX_FILE, `${JSON.stringify(index)}\n`);
  console.log(
    `indexed ${chunks.length} chunks with ${EMBEDDING_MODEL} (${embeddings[0]?.length ?? 0} dims, ${usage.tokens} tokens) → ${INDEX_FILE}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
