export type ScreenVerdict =
  | { verdict: "allow" }
  | { verdict: "block"; reason: "prompt_injection" | "instruction_leak" | "role_spoofing" };

export const SCREEN_REFUSAL =
  "I can't change how I work, but I can check spraying conditions or the weather for you. Try: \"Can I spray in Lyon tomorrow?\"";

const MAX_SCREENED_CHARS = 4000;

const RULES: Array<{ reason: Exclude<ScreenVerdict, { verdict: "allow" }>["reason"]; pattern: RegExp }> = [
  {
    reason: "prompt_injection",
    pattern:
      /\b(ignore|disregard|forget|override|bypass)\b[^.?!\n]{0,40}\b(previous|prior|above|earlier|all|any|your|the|these|system)\b[^.?!\n]{0,20}\b(instructions?|rules|prompts?|guidelines|guardrails)\b/i,
  },
  { reason: "prompt_injection", pattern: /\b(you are now|from now on you are|act as (an? )?(unfiltered|unrestricted|different))\b/i },
  { reason: "prompt_injection", pattern: /\b(developer|god|debug|admin) mode\b|\bjailbreak\b|\bDAN\b/i },
  { reason: "prompt_injection", pattern: /\bpretend (to be|you are|that you)\b/i },
  {
    reason: "instruction_leak",
    pattern: /\b(show|reveal|print|repeat|output|display|tell me|what (are|were|is))\b[^.?!\n]{0,30}\b(system prompt|hidden prompt|your (instructions|rules|prompt)|initial instructions)\b/i,
  },
  { reason: "role_spoofing", pattern: /<\/?\s*(system|assistant|developer|tool)\s*>|^\s*(system|assistant|developer)\s*:/im },
];

function normalize(text: string): string {
  return text.normalize("NFKC").replace(/[​-‏⁠﻿]/g, "").replace(/\s+/g, " ").slice(0, MAX_SCREENED_CHARS);
}

export function screenInput(text: string): ScreenVerdict {
  const normalized = normalize(text);
  const match = RULES.find(({ pattern }) => pattern.test(normalized));
  return match ? { verdict: "block", reason: match.reason } : { verdict: "allow" };
}
