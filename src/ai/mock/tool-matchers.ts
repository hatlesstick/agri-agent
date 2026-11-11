import type { MockToolMatcher } from "@/ai/mock/model";

const DEFAULT_MOCK_CITY = "Lyon";
const CITY_AFTER_PREPOSITION = /\bin\s+(\p{Lu}[\p{L}'’-]*)/u;

function cityFrom(text: string): string {
  return text.match(CITY_AFTER_PREPOSITION)?.[1] ?? DEFAULT_MOCK_CITY;
}

export const MOCK_TOOL_MATCHERS: MockToolMatcher[] = [
  {
    toolName: "getWeather",
    matches: (text) => /\bweather\b/i.test(text),
    input: (text) => ({ city: cityFrom(text) }),
  },
];
