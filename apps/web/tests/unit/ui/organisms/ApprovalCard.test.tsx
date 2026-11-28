import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApprovalCard } from "@/ui/organisms/ApprovalCard";

const rows = [{ label: "Назва", value: "Пшениця, північ" }];

describe("ApprovalCard", () => {
  it("offers confirm and reject while waiting, and calls the right handler", async () => {
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    render(<ApprovalCard title="Зберегти поле" rows={rows} status="awaiting" onConfirm={onConfirm} onReject={onReject} />);
    expect(screen.getByText("Зберегти поле")).toBeTruthy();
    expect(screen.getByText("Пшениця, північ")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Підтвердити" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Відхилити" }));
    expect(onReject).toHaveBeenCalledOnce();
  });

  it("replaces the actions with the confirmed state", () => {
    render(<ApprovalCard title="Зберегти поле" rows={rows} status="confirmed" onConfirm={() => {}} onReject={() => {}} />);
    expect(screen.getByText("Збережено")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
