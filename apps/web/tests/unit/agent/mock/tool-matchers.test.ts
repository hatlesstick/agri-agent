import { describe, expect, it } from "vitest";
import { MOCK_TOOL_MATCHERS } from "@/agent/mock/tool-matchers";

const weatherMatcher = MOCK_TOOL_MATCHERS.find((matcher) => matcher.toolName === "getWeather");

const sprayMatcher = MOCK_TOOL_MATCHERS.find((matcher) => matcher.toolName === "sprayWindow");

describe("sprayWindow mock matcher", () => {
  it("matches a spraying question and asks for tomorrow", () => {
    expect(sprayMatcher?.matches("Can I spray in Munich tomorrow?")).toBe(true);
    expect(sprayMatcher?.input("Can I spray in Munich tomorrow?")).toEqual({ city: "Munich", date: "tomorrow" });
  });

  it("is checked before the weather matcher", () => {
    const text = "Is the weather good enough to spray in Lyon?";
    const first = MOCK_TOOL_MATCHERS.find((matcher) => matcher.matches(text));
    expect(first?.toolName).toBe("sprayWindow");
  });
});

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

  it("asks for a city instead of inventing one when none is given", () => {
    expect(weatherMatcher?.input("what is the weather?")).toBeNull();
  });
});
