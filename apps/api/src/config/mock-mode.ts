export function isMockMode(): boolean {
  return process.env.AI_MOCK === "1";
}
