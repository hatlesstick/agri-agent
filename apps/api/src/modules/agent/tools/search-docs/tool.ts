import { Logger } from "@nestjs/common";
import { tool } from "ai";
import type { RagEngine } from "@/modules/rag";
import { searchDocs } from "@/modules/rag";
import {
  searchDocsInputSchema,
  searchDocsOutputSchema,
  type SearchDocsInput,
  type SearchDocsOutput,
} from "@agri/shared/contracts";

const logger = new Logger("SearchDocsTool");

export async function runSearchDocs(input: SearchDocsInput, { rag }: { rag: RagEngine }): Promise<SearchDocsOutput> {
  try {
    const hits = await searchDocs(rag, input.query);
    return searchDocsOutputSchema.parse(hits ? { hits } : { error: "search_unavailable" });
  } catch (error) {
    logger.warn("searchDocs failed", error instanceof Error ? error.message : error);
    return { error: "search_unavailable" };
  }
}

export function createSearchDocsTool(rag: RagEngine) {
  return tool({
    description:
      "Search the spraying-practice knowledge base (drift, temperature inversions, rainfastness, Delta T, labels, buffer zones). Returns the most relevant passages with their source. Use it for 'why', 'how' and good-practice questions, not for weather data.",
    inputSchema: searchDocsInputSchema,
    outputSchema: searchDocsOutputSchema,
    execute: (input) => runSearchDocs(input, { rag }),
  });
}
