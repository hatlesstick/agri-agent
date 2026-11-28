import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PendingAction } from "@agri/shared/contracts";
import { ApprovalsList } from "@/ui/organisms/ApprovalsList";

const saveAction: PendingAction = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "field.save",
  status: "awaiting_confirmation",
  expiresAt: "2026-11-28T12:00:00.000Z",
  payload: { name: "Wheat near Lyon", lat: 45.76, lon: 4.84 },
};

const base = { loadFailed: false, decideFailed: false, deciding: false };

describe("ApprovalsList", () => {
  it("shows the empty state when nothing waits for approval", () => {
    render(<ApprovalsList actions={[]} onDecide={() => {}} {...base} />);
    expect(screen.getByText("Записів для підтвердження немає")).toBeTruthy();
  });

  it("shows each waiting action with its title and fields", () => {
    render(<ApprovalsList actions={[saveAction]} onDecide={() => {}} {...base} />);
    expect(screen.getByText("Зберегти поле")).toBeTruthy();
    expect(screen.getByText("Wheat near Lyon")).toBeTruthy();
  });

  it("confirms and rejects by the action id", async () => {
    const onDecide = vi.fn();
    render(<ApprovalsList actions={[saveAction]} onDecide={onDecide} {...base} />);
    await userEvent.click(screen.getByRole("button", { name: "Підтвердити" }));
    expect(onDecide).toHaveBeenLastCalledWith(saveAction.id, "confirmed");
    await userEvent.click(screen.getByRole("button", { name: "Відхилити" }));
    expect(onDecide).toHaveBeenLastCalledWith(saveAction.id, "rejected");
  });

  it("shows a message when the list could not be loaded", () => {
    render(<ApprovalsList actions={[]} onDecide={() => {}} {...base} loadFailed />);
    expect(screen.getByText("Не вдалося виконати дію. Спробуйте ще раз.")).toBeTruthy();
  });
});
