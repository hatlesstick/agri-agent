import type React from "react";
import type { TextInputProps } from "./TextInput.types";

export const TextInput: React.FC<TextInputProps> = ({ className = "", ...props }) => (
  <input className={`flex-1 rounded-lg border border-zinc-300 px-4 py-2 disabled:bg-zinc-100 ${className}`.trim()} {...props} />
);
