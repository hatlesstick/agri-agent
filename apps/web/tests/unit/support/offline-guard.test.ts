import { describe, expect, it } from "vitest";
import { blockedFetch, installOfflineGuard } from "@tests/support/offline-guard";

describe("offline guard", () => {
  it("rejects any request with the blocked URL in the message", async () => {
    await expect(blockedFetch("https://api.open-meteo.com/v1/forecast?latitude=1")).rejects.toThrow(
      "Network access is disabled in CI: https://api.open-meteo.com/v1/forecast?latitude=1",
    );
  });

  it("accepts Request and URL inputs", async () => {
    await expect(blockedFetch(new URL("https://ai-gateway.vercel.sh/v1"))).rejects.toThrow("https://ai-gateway.vercel.sh/v1");
    await expect(blockedFetch(new Request("https://cloud.langfuse.com/api"))).rejects.toThrow("https://cloud.langfuse.com/api");
  });

  it("replaces fetch only when CI_OFFLINE is 1", () => {
    const original = async () => new Response("ok");
    const enabled = { fetch: original };
    const disabled = { fetch: original };

    installOfflineGuard(enabled, { CI_OFFLINE: "1" });
    installOfflineGuard(disabled, {});

    expect(enabled.fetch).toBe(blockedFetch);
    expect(disabled.fetch).toBe(original);
  });
});
