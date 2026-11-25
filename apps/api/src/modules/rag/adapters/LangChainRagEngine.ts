import type { DocChunkStore } from "@/modules/rag/doc-chunk-store.types";
import type { RagCandidate, RagEngine } from "@/modules/rag/rag.types";

export type QueryEmbedder = { embedQuery(text: string): Promise<number[]> };

export class LangChainRagEngine implements RagEngine {
  constructor(
    private readonly store: DocChunkStore,
    private readonly embeddings: QueryEmbedder,
  ) {}

  async search(query: string, { topK }: { topK: number }): Promise<RagCandidate[] | null> {
    const matches = await this.store.search(await this.embeddings.embedQuery(query), topK);
    if (matches.length === 0) return null;
    return matches.map(({ chunk, score }) => ({
      id: chunk.id,
      source: chunk.source,
      title: chunk.title,
      heading: chunk.heading,
      text: chunk.text,
      score,
    }));
  }
}
