import { describe, expect, it } from "vitest";
import { resolveDay, todayIn } from "@/domain/spray/dates";

const LATE_EVENING_UTC = new Date("2026-11-11T23:30:00Z");

describe("todayIn", () => {
  it("returns the local date of the time zone", () => {
    expect(todayIn("Europe/Paris", LATE_EVENING_UTC)).toBe("2026-11-12");
    expect(todayIn("Europe/London", LATE_EVENING_UTC)).toBe("2026-11-11");
    expect(todayIn("UTC", LATE_EVENING_UTC)).toBe("2026-11-11");
  });
});

describe("resolveDay", () => {
  it.each([
    ["today", "2026-11-12"],
    ["tomorrow", "2026-11-13"],
    ["day_after_tomorrow", "2026-11-14"],
  ])("resolves %s in the city's time zone", (day, expected) => {
    expect(resolveDay(day, "Europe/Paris", LATE_EVENING_UTC)).toBe(expected);
  });

  it("crosses month and year boundaries", () => {
    expect(resolveDay("tomorrow", "UTC", new Date("2026-12-31T12:00:00Z"))).toBe("2027-01-01");
  });

  it("returns an explicit date unchanged", () => {
    expect(resolveDay("2026-11-20", "Europe/Paris", LATE_EVENING_UTC)).toBe("2026-11-20");
  });
});
