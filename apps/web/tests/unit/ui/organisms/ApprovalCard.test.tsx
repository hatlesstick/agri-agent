import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApprovalCard } from "@/ui/organisms/ApprovalCard";

const rows = [{ label: "Поле", value: "Пшениця, північ" }];

describe("ApprovalCard", () => {
  it("offers save, edit and cancel while waiting for confirmation", async () => {
    const onSave = vi.fn();
    render(<ApprovalCard rows={rows} status="awaiting" onSave={onSave} onEdit={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Чекає на ваше підтвердження")).toBeTruthy();
    expect(screen.getByText("Пшениця, північ")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Зберегти запис" }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Змінити" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Скасувати" })).toBeTruthy();
  });

  it("replaces the actions with the confirmed state", () => {
    render(<ApprovalCard rows={rows} status="confirmed" onSave={() => {}} onEdit={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Збережено")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
