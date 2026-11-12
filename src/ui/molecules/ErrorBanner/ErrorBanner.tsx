import type React from "react";
import { Button } from "@/ui/atoms/Button";
import type { ErrorBannerProps } from "./ErrorBanner.types";

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => (
  <div role="alert" className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
    <span>{message}</span>
    <Button variant="link" onClick={onRetry}>
      Retry
    </Button>
  </div>
);
