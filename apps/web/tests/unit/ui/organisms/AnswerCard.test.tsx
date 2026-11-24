import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnswerCard } from "@/ui/organisms/AnswerCard";

describe("AnswerCard", () => {
  it("shows the answer, its sources and the confidence", () => {
    render(<AnswerCard text="Обприскувати можна вранці." sources={[{ title: "Посібник", updatedAt: "2026-11-12T08:00" }]} confidence={0.8} />);
    expect(screen.getByText("Обприскувати можна вранці.")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Джерела" })).toBeTruthy();
    expect(screen.getByRole("meter", { name: "Впевненість" }).getAttribute("aria-valuenow")).toBe("80");
  });
});
