import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { DocChunk, DocumentError } from "@/modules/rag/rag.types";
import { cleanDocument } from "@/modules/rag/domain/clean-document";
import { validateDocument } from "@/modules/rag/domain/validate-document";

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 150;

export type ChunkResult = { chunks: DocChunk[] } | { error: DocumentError };

const SECTION_SPLIT = /^##\s+/m;

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function splitLongBody(body: string): Promise<string[]> {
  if (body.length <= CHUNK_SIZE) return [body];
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP });
  return splitter.splitText(body);
}

export async function chunkDocument(fileName: string, markdown: string): Promise<ChunkResult> {
  const cleaned = cleanDocument(markdown);
  const meta = validateDocument(cleaned);
  if ("error" in meta) return { error: meta.error };

  const sections = cleaned
    .split(SECTION_SPLIT)
    .slice(1)
    .map((section) => {
      const [headingLine, ...body] = section.split("\n");
      return { heading: headingLine.trim(), body: body.join("\n").trim() };
    })
    .filter(({ heading, body }) => heading && body);

  const chunks: DocChunk[] = [];
  for (const { heading, body } of sections) {
    const parts = await splitLongBody(body);
    const baseId = `${fileName}#${slugify(heading)}`;
    parts.forEach((part, index) => {
      chunks.push({
        id: parts.length === 1 ? baseId : `${baseId}-${index + 1}`,
        source: meta.source,
        title: meta.title,
        heading,
        updatedAt: meta.updatedAt,
        text: `${meta.title} — ${heading}\n\n${part}`,
      });
    });
  }
  return { chunks };
}
