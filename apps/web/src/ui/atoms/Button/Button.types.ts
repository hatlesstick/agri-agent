import type { ButtonHTMLAttributes } from "react";
import type { VariantProps } from "class-variance-authority";
import type { button } from "./Button";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;
