import type React from "react";
import type { SkeletonProps } from "@/ui/atoms/Skeleton/Skeleton.types";

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => (
  <span aria-hidden className={`block animate-pulse rounded-md bg-rule/60 motion-reduce:animate-none ${className}`} />
);
