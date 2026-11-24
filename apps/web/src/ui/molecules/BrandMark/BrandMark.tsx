import type React from "react";
import { useT } from "@/ui/hooks/useT";

export const BrandMark: React.FC = () => {
  const t = useT();
  return (
    <div className="flex items-center gap-2 px-3 pb-4">
      <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-brand font-display text-base font-bold text-brand-ink">
        А
      </span>
      <span className="font-display text-base font-bold">{t("app.name")}</span>
    </div>
  );
};
