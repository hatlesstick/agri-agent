function cleanLine(line: string): string {
  const indent = line.match(/^[ \t]*/)?.[0] ?? "";
  return indent + line.slice(indent.length).replace(/[ \t]+/g, " ").replace(/ $/, "");
}

export function cleanDocument(markdown: string): string {
  return markdown
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(cleanLine)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
