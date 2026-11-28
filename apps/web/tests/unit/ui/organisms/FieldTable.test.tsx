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
    render(<FieldTable fields={[{ id: "f1", name: "Північ", crop: "Пшениця", areaHa: 42 }]} />);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Поле" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Пшениця" })).toBeTruthy();
  });
});

describe("FieldTable loading and failure", () => {
  it("shows skeletons, not the empty state, while fields load", () => {
    const { container } = render(<FieldTable fields={[]} loading />);
    expect(screen.queryByText("Поля ще не додані")).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("shows an error, not the empty state, when fields fail to load", () => {
    render(<FieldTable fields={[]} failed />);
    expect(screen.queryByText("Поля ще не додані")).toBeNull();
    expect(screen.getByText("Не вдалося завантажити поля. Спробуйте пізніше.")).toBeTruthy();
  });
});
