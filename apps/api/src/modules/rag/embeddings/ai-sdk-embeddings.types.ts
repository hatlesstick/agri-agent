export type EmbeddingBackend = {
  embedMany(values: string[]): Promise<number[][]>;
  embed(value: string): Promise<number[]>;
};
