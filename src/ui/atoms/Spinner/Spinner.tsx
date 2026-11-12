import type React from "react";

export const Spinner: React.FC = () => (
  <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
);
