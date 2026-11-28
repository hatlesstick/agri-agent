import type React from "react";
import { Button } from "@/ui/atoms/Button";
import { useT } from "@/ui/hooks/useT";
import type { ApprovalCardProps } from "./ApprovalCard.types";

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ title, rows, status, onConfirm, onReject }) => {
  const t = useT();
  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] border border-rule bg-surface">
      <header className="bg-brand-wash px-4 py-3 font-semibold text-brand-ink">
        {status === "awaiting" ? title : t("approval.confirmed")}
      </header>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-4 py-3">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-ink-soft">{row.label}</dt>
            <dd className="break-words font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
      {status === "awaiting" && (
        <div className="flex flex-wrap gap-2 border-t border-rule px-4 py-3">
          <Button onClick={onConfirm}>{t("approval.confirm")}</Button>
          <Button variant="quiet" onClick={onReject}>{t("approval.reject")}</Button>
        </div>
      )}
    </article>
  );
};
