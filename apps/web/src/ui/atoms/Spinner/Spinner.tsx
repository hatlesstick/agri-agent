import type React from "react";

export const Spinner: React.FC = () => (
  <span aria-hidden className="inline-block size-3 animate-spin rounded-full border-2 border-rule border-t-ink motion-reduce:animate-none" />
);
