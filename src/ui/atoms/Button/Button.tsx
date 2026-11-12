import type React from "react";
import type { ButtonProps, ButtonVariant } from "./Button.types";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50",
  secondary: "rounded-lg border border-zinc-300 px-4 py-2",
  link: "underline",
};

export const Button: React.FC<ButtonProps> = ({ variant = "primary", type = "button", className = "", ...props }) => (
  <button type={type} className={`${VARIANT_CLASS[variant]} ${className}`.trim()} {...props} />
);
