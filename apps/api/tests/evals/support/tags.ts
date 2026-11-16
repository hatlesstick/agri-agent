const TAG = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export function evalTags(raw: string | undefined): string[] {
  const tags = (raw ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const invalid = tags.find((tag) => !TAG.test(tag));
  if (invalid !== undefined) throw new Error(`Invalid EVAL_TAGS entry: "${invalid}"`);
  return [...new Set(tags)];
}
