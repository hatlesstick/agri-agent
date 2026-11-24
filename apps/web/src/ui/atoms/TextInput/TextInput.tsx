import type React from "react";
import type { TextInputProps } from "./TextInput.types";

export const TextInput: React.FC<TextInputProps> = ({ className = "", ...props }) => (
  <input
    className={`min-h-11 flex-1 rounded-xl border border-rule bg-surface px-4 py-2 text-ink placeholder:text-ink-soft focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-60 ${className}`.trim()}
    {...props}
  />
);
