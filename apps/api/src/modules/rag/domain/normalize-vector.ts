export function normalizeVector(vector: number[]): number[] {
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (length === 0) throw new Error("cannot normalize a zero vector");
  return vector.map((value) => value / length);
}
