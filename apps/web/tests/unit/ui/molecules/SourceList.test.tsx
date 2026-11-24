import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceList } from "@/ui/molecules/SourceList";

describe("SourceList", () => {
  it("lists each source with its update time", () => {
    render(<SourceList sources={[{ title: "Посібник з обприскування", updatedAt: "2026-11-24T08:00" }]} />);
    expect(screen.getByRole("list", { name: "Джерела" })).toBeTruthy();
    expect(screen.getByText("Посібник з обприскування")).toBeTruthy();
    expect(screen.getByText(/2026-11-24/)).toBeTruthy();
  });

  it("says there are no sources when the list is empty", () => {
    render(<SourceList sources={[]} />);
    expect(screen.getByText("Джерел немає")).toBeTruthy();
  });
});
