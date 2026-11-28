import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

type ChatStatus = "ready" | "submitted" | "streaming" | "error";
const chat = vi.hoisted(() => ({ status: "ready" as ChatStatus }));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({ messages: [], sendMessage: vi.fn(), status: chat.status, stop: vi.fn(), error: undefined, regenerate: vi.fn() }),
}));

import { useAgentChat } from "@/ui/hooks/useAgentChat";
import { approvalKeys } from "@/ui/queries/approval-queries";

describe("useAgentChat", () => {
  it("refetches the approvals list when a reply finishes", () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    chat.status = "streaming";
    const { rerender } = renderHook(() => useAgentChat(), { wrapper });
    expect(invalidate).not.toHaveBeenCalled();
    chat.status = "ready";
    rerender();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.list });
  });

  it("does not refetch approvals while nothing has changed", () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    chat.status = "ready";
    const { rerender } = renderHook(() => useAgentChat(), { wrapper });
    rerender();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
