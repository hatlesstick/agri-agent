import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useChatOpen } from "@/ui/hooks/useChatOpen";

describe("useChatOpen", () => {
  it("starts open and toggles", () => {
    const { result } = renderHook(() => useChatOpen());
    expect(result.current.open).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
  });
});
