import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConversationHistory } from "@/ui/organisms/ConversationHistory";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function renderHistory(props: Partial<Parameters<typeof ConversationHistory>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const handlers = { onOpen: vi.fn(), onNew: vi.fn(), onDeleted: vi.fn() };
  render(
    <QueryClientProvider client={client}>
      <ConversationHistory activeId={null} {...handlers} {...props} />
    </QueryClientProvider>,
  );
  return handlers;
}

describe("ConversationHistory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the user's conversations after the list is expanded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          conversations: [
            { id: ID_A, title: "Пшениця біля Ліона", createdAt: "2026-11-28T10:00:00.000Z", updatedAt: "2026-11-28T10:00:00.000Z" },
            { id: ID_B, title: null, createdAt: "2026-11-27T10:00:00.000Z", updatedAt: "2026-11-27T10:00:00.000Z" },
          ],
          nextCursor: null,
        }),
      ),
    );
    renderHistory();
    await userEvent.click(screen.getByRole("button", { name: "Розмови" }));
    expect(await screen.findByRole("button", { name: "Пшениця біля Ліона" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Без назви" })).toBeTruthy();
  });

  it("opens a conversation and starts a new one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ conversations: [{ id: ID_A, title: "Пшениця", createdAt: "2026-11-28T10:00:00.000Z", updatedAt: "2026-11-28T10:00:00.000Z" }], nextCursor: null })));
    const handlers = renderHistory();
    await userEvent.click(screen.getByRole("button", { name: "Розмови" }));
    await userEvent.click(await screen.findByRole("button", { name: "Пшениця" }));
    expect(handlers.onOpen).toHaveBeenCalledWith(ID_A);
    await userEvent.click(screen.getByRole("button", { name: "Нова розмова" }));
    expect(handlers.onNew).toHaveBeenCalled();
  });

  it("deletes only after confirmation and tells the panel when the open conversation is deleted", async () => {
    const fetchMock = vi.fn(async (_path: string, init?: RequestInit) =>
      init?.method === "DELETE" ? new Response(null, { status: 204 }) : jsonResponse({ conversations: [{ id: ID_A, title: "Пшениця", createdAt: "2026-11-28T10:00:00.000Z", updatedAt: "2026-11-28T10:00:00.000Z" }], nextCursor: null }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const handlers = renderHistory({ activeId: ID_A });
    await userEvent.click(screen.getByRole("button", { name: "Розмови" }));
    await userEvent.click(await screen.findByRole("button", { name: "Видалити" }));
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === "DELETE")).toBe(false);
    const confirm = screen.getAllByRole("button", { name: "Видалити" }).at(-1);
    if (!confirm) throw new Error("no confirm button");
    await userEvent.click(confirm);
    await waitFor(() => expect(fetchMock.mock.calls.some(([path, init]) => path === `/api/conversations/${ID_A}` && (init as RequestInit | undefined)?.method === "DELETE")).toBe(true));
    expect(handlers.onDeleted).toHaveBeenCalledWith(ID_A);
  });
});
