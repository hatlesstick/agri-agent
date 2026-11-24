import type React from "react";
import type { IconProps } from "./Icon.types";

export const Icon: React.FC<IconProps> = ({ icon: Glyph, size = 18, label, className }) => (
  <Glyph width={size} height={size} strokeWidth={2} className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
);
