type FetchInput = string | URL | Request;

type FetchHolder = { fetch: unknown };

function urlOf(input: FetchInput): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export async function blockedFetch(input: FetchInput): Promise<Response> {
  throw new Error(`Network access is disabled in CI: ${urlOf(input)}`);
}

export function installOfflineGuard(target: FetchHolder = globalThis, env: Record<string, string | undefined> = process.env): void {
  if (env.CI_OFFLINE === "1") target.fetch = blockedFetch;
}
