import type { Chunk } from "@/server/repositories/docs/docs.types";

const SOURCE_LINE = /^Source:\s*(.+)$/m;
const TITLE_LINE = /^#\s+(.+)$/m;

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function chunkMarkdown(fileName: string, markdown: string): Chunk[] {
  const title = markdown.match(TITLE_LINE)?.[1]?.trim();
  if (!title) throw new Error(`${fileName}: missing "# Title" line`);
  const source = markdown.match(SOURCE_LINE)?.[1]?.trim();
  if (!source) throw new Error(`${fileName}: missing "Source:" line`);

  return markdown
    .split(/^##\s+/m)
    .slice(1)
    .map((section) => {
      const [headingLine, ...body] = section.split("\n");
      return { heading: headingLine.trim(), body: body.join("\n").trim() };
    })
    .filter(({ heading, body }) => heading && body)
    .map(({ heading, body }) => ({
      id: `${fileName}#${slugify(heading)}`,
      source,
      title,
      heading,
      text: `${title} — ${heading}\n\n${body}`,
    }));
}
