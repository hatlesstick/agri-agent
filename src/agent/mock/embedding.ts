const DIMENSIONS = 512;
const STOP_WORDS = new Set(["the", "and", "for", "can", "with", "that", "this", "are", "you", "how", "what", "when", "should", "from", "not", "use"]);

function hash(word: string): number {
  let value = 2166136261;
  for (const char of word) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return Math.abs(value) % DIMENSIONS;
}

function stem(word: string): string {
  return word.replace(/(ings|ing|ions|ion|ed|es|s)$/, "");
}

export function mockEmbedding(text: string): number[] {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  const words = text.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    vector[hash(stem(word))] += 1;
  }
  return vector;
}
