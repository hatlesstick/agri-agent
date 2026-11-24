import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldTable } from "@/ui/organisms/FieldTable";

describe("FieldTable", () => {
  it("explains how the first field will appear when there are none", () => {
    render(<FieldTable fields={[]} />);
    expect(screen.getByText("Поля ще не додані")).toBeTruthy();
    expect(screen.getByText(/Спитайте в чаті/)).toBeTruthy();
  });

  it("lists fields as a table with a header row", () => {
    render(<FieldTable fields={[{ name: "Північ", crop: "Пшениця", areaHa: 42 }]} />);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Поле" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Пшениця" })).toBeTruthy();
  });
});
