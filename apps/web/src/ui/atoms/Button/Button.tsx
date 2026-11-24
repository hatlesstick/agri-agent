import type React from "react";
import { cva } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import type { ButtonProps } from "./Button.types";

export const button = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:opacity-90",
        secondary: "border border-ink text-ink hover:bg-brand-wash",
        quiet: "text-ink underline underline-offset-4",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export const Button: React.FC<ButtonProps> = ({ variant, type = "button", className, ...props }) => (
  <button type={type} className={twMerge(button({ variant }), className)} {...props} />
);
