import { describe, expect, it } from "vitest";
import { MOCK_TOOL_MATCHERS } from "@/ai/mock/tool-matchers";

const weatherMatcher = MOCK_TOOL_MATCHERS.find((matcher) => matcher.toolName === "getWeather");

describe("getWeather mock matcher", () => {
  it.each([
    ["What is the weather in Lyon?", "Lyon"],
    ["weather in Munich tomorrow", "Munich"],
    ["Weather forecast in Kraków", "Kraków"],
  ])("matches %s and extracts %s", (text, city) => {
    expect(weatherMatcher?.matches(text)).toBe(true);
    expect(weatherMatcher?.input(text)).toEqual({ city });
  });

  it("does not match unrelated text", () => {
    expect(weatherMatcher?.matches("Tell me a joke")).toBe(false);
  });

  it("falls back to Lyon when no city is given", () => {
    expect(weatherMatcher?.input("what is the weather?")).toEqual({ city: "Lyon" });
  });
});
