import type React from "react";
import { Button } from "@/ui/atoms/Button";
import { useT } from "@/ui/hooks/useT";
import type { ErrorBannerProps } from "./ErrorBanner.types";

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  const t = useT();
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-stop px-4 py-2 text-sm text-stop">
      <span>{message}</span>
      <Button variant="quiet" onClick={onRetry}>
        {t("chat.retry")}
      </Button>
    </div>
  );
};
