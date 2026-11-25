import type { DocumentError } from "@/modules/rag/rag.types";

export type DocumentMeta = { title: string; source: string; updatedAt: string };
export type ValidationResult = DocumentMeta | { error: DocumentError };

const TITLE_LINE = /^#\s+(.+)$/m;
const SOURCE_LINE = /^Source:\s*(.+)$/m;
const UPDATED_LINE = /^Updated:\s*(\S+)\s*$/m;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function validateDocument(markdown: string): ValidationResult {
  const title = markdown.match(TITLE_LINE)?.[1]?.trim();
  if (!title) return { error: "missing_title" };
  const source = markdown.match(SOURCE_LINE)?.[1]?.trim();
  if (!source) return { error: "missing_source" };
  const updatedAt = markdown.match(UPDATED_LINE)?.[1];
  if (!updatedAt) return { error: "missing_updated" };
  if (!isCalendarDate(updatedAt)) return { error: "invalid_updated" };
  return { title, source, updatedAt };
}
