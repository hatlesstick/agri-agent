import { embed, embedMany } from "ai";
import { Embeddings } from "@langchain/core/embeddings";
import { normalizeVector } from "@/modules/rag/domain/normalize-vector";
import { EMBEDDING_MODEL } from "@/modules/rag/embeddings/embedding-model";
import { mockEmbedding } from "@/modules/rag/embeddings/mock-embedding";
import type { EmbeddingBackend } from "@/modules/rag/embeddings/ai-sdk-embeddings.types";

export const EMBEDDING_DIMENSIONS = 1536;

const PROVIDER_OPTIONS = { google: { outputDimensionality: EMBEDDING_DIMENSIONS } };

export function createEmbeddingBackend(mock: boolean): EmbeddingBackend {
  if (mock) {
    return {
      embedMany: async (values) => values.map((value) => mockEmbedding(value, EMBEDDING_DIMENSIONS)),
      embed: async (value) => mockEmbedding(value, EMBEDDING_DIMENSIONS),
    };
  }
  return {
    embedMany: async (values) => {
      const { embeddings } = await embedMany({ model: EMBEDDING_MODEL, values, providerOptions: PROVIDER_OPTIONS, maxRetries: 2 });
      return embeddings;
    },
    embed: async (value) => {
      const { embedding } = await embed({ model: EMBEDDING_MODEL, value, providerOptions: PROVIDER_OPTIONS, maxRetries: 2 });
      return embedding;
    },
  };
}

export class AiSdkEmbeddings extends Embeddings<number[]> {
  constructor(private readonly backend: EmbeddingBackend) {
    super({});
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const vectors = await this.backend.embedMany(documents);
    return vectors.map(normalizeVector);
  }

  async embedQuery(document: string): Promise<number[]> {
    return normalizeVector(await this.backend.embed(document));
  }
}
