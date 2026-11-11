import { tool } from "ai";
import { searchDocs } from "@/agent/rag/search";
import {
  searchDocsInputSchema,
  searchDocsOutputSchema,
  type SearchDocsInput,
  type SearchDocsOutput,
} from "@/agent/tools/search-docs/schemas";

export async function runSearchDocs(input: SearchDocsInput): Promise<SearchDocsOutput> {
  try {
    const hits = await searchDocs(input.query);
    return searchDocsOutputSchema.parse(hits ? { hits } : { error: "search_unavailable" });
  } catch (error) {
    console.warn("searchDocs failed", error instanceof Error ? error.message : error);
    return { error: "search_unavailable" };
  }
}

export const searchDocsTool = tool({
  description:
    "Search the spraying-practice knowledge base (drift, temperature inversions, rainfastness, Delta T, labels, buffer zones). Returns the most relevant passages with their source. Use it for 'why', 'how' and good-practice questions, not for weather data.",
  inputSchema: searchDocsInputSchema,
  outputSchema: searchDocsOutputSchema,
  execute: (input) => runSearchDocs(input),
});
