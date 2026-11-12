import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "link";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };
