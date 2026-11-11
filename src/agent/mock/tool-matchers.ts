import type { MockToolMatcher } from "@/agent/mock/model";

const CITY_AFTER_PREPOSITION = /\b(?:in|for|at|near)\s+(\p{L}[\p{L}'’-]*)/iu;

const NON_CITY_WORDS = new Set([
  "a", "an", "the", "is", "are", "be", "it", "i", "we", "my", "me", "can", "could", "should", "will", "would",
  "what", "whats", "how", "when", "where", "which", "do", "does", "to", "of", "and", "or", "please",
  "weather", "forecast", "spray", "spraying", "field", "fields", "today", "tomorrow", "now", "good", "ok", "okay",
  "day", "week", "this", "next",
]);

function capitalize(word: string): string {
  return word.charAt(0).toLocaleUpperCase("en") + word.slice(1);
}

export function cityFrom(text: string): string | null {
  const afterPreposition = text.match(CITY_AFTER_PREPOSITION)?.[1];
  if (afterPreposition && !NON_CITY_WORDS.has(afterPreposition.toLowerCase())) return capitalize(afterPreposition);

  const candidates = (text.match(/\p{L}[\p{L}'’-]*/gu) ?? []).filter((word) => !NON_CITY_WORDS.has(word.toLowerCase()));
  const candidate = candidates.at(-1);
  return candidate ? capitalize(candidate) : null;
}

const PRACTICE_TOPIC = /\b(drift|inversion|rainfast\w*|delta t|label|buffer|nozzle|droplet)/i;

export const MOCK_TOOL_MATCHERS: MockToolMatcher[] = [
  {
    toolName: "searchDocs",
    matches: (text) => PRACTICE_TOPIC.test(text),
    input: (text) => ({ query: text.slice(0, 200) }),
  },
  {
    toolName: "sprayOutlook",
    matches: (text) =>
      /\bspray/i.test(text) && /\b(when|which day|this week)\b/i.test(text) && !/\b(today|tomorrow)\b/i.test(text),
    input: (text) => {
      const city = cityFrom(text);
      return city ? { city } : null;
    },
  },
  {
    toolName: "sprayWindow",
    matches: (text) => /\bspray/i.test(text),
    input: (text) => {
      const city = cityFrom(text);
      return city ? { city, date: "tomorrow" } : null;
    },
  },
  {
    toolName: "getWeather",
    matches: (text) => /\bweather\b|\bforecast\b/i.test(text),
    input: (text) => {
      const city = cityFrom(text);
      return city ? { city } : null;
    },
  },
];
