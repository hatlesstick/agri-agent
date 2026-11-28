import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConversationHistory } from "@/ui/organisms/ConversationHistory";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const row = (id: string, title: string) => ({ id, title, createdAt: "2026-11-28T10:00:00.000Z", updatedAt: "2026-11-28T10:00:00.000Z" });

describe("ConversationHistory after deleting one conversation", () => {
  it("keeps the other conversations visible", async () => {
    let rows = [row(ID_A, "Перша"), row(ID_B, "Друга")];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_path: string, init?: RequestInit) => {
        if (init?.method === "DELETE") {
          rows = rows.filter((item) => item.id !== ID_A);
          return new Response(null, { status: 204 });
        }
        return new Response(JSON.stringify({ conversations: rows, nextCursor: null }), { status: 200, headers: { "content-type": "application/json" } });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ConversationHistory activeId={null} onOpen={() => {}} onNew={() => {}} onDeleted={() => {}} />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Розмови" }));
    await screen.findByRole("button", { name: /Перша/ });
    await userEvent.click(screen.getAllByRole("button", { name: "Видалити" })[0]);
    await userEvent.click(screen.getAllByRole("button", { name: "Видалити" }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Перша/ })).toBeNull());
    expect(await screen.findByRole("button", { name: /Друга/ })).toBeTruthy();
  });
});
