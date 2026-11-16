import type React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { MarkdownProps } from "./Markdown.types";

const ALLOWED_ELEMENTS = ["p", "strong", "em", "ul", "ol", "li", "br", "code"];

const COMPONENTS: Components = {
  p: ({ children }) => <p className="my-1">{children}</p>,
  ul: ({ children }) => <ul className="my-1 list-disc space-y-0.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 list-decimal space-y-0.5 pl-5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-white px-1 font-mono text-[0.9em]">{children}</code>,
};

export const Markdown: React.FC<MarkdownProps> = ({ text }) => (
  <ReactMarkdown allowedElements={ALLOWED_ELEMENTS} unwrapDisallowed components={COMPONENTS}>
    {text}
  </ReactMarkdown>
);
