import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ForgetMyData } from "@/ui/organisms/ForgetMyData";

describe("ForgetMyData", () => {
  it("asks for a second confirmation before anything is deleted", async () => {
    const onConfirm = vi.fn();
    render(<ForgetMyData pending={false} failed={false} result={null} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Видалити мої дані" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Підтвердити видалення" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("can be cancelled at the second step", async () => {
    const onConfirm = vi.fn();
    render(<ForgetMyData pending={false} failed={false} result={null} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Видалити мої дані" }));
    await userEvent.click(screen.getByRole("button", { name: "Скасувати" }));
    expect(screen.getByRole("button", { name: "Видалити мої дані" })).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("reports what was deleted", () => {
    render(<ForgetMyData pending={false} failed={false} result={{ fields: 2, actions: 1, conversations: 3 }} onConfirm={() => {}} />);
    expect(screen.getByText("Видалено: полів 2, дій 1, розмов 3.")).toBeTruthy();
  });
});
