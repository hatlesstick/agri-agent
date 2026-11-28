"use client";

import type React from "react";
import { ApprovalCard } from "@/ui/organisms/ApprovalCard";
import { Skeleton } from "@/ui/atoms/Skeleton";
import { CLEARED, describeApproval, FIELD_LABEL_KEYS, KIND_LABEL_KEYS } from "@/ui/helpers/approval-description";
import { useT } from "@/ui/hooks/useT";
import type { ApprovalsListProps } from "@/ui/organisms/ApprovalsList/ApprovalsList.types";

export const ApprovalsList: React.FC<ApprovalsListProps> = ({ actions, loading, loadFailed, decideFailed, deciding, onDecide }) => {
  const t = useT();
  if (loading) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        {[0, 1].map((slot) => (
          <div key={slot} className="flex flex-col gap-3 rounded-[20px] border border-rule bg-surface p-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  if (loadFailed) return <p className="text-stop">{t("approval.error")}</p>;
  if (actions.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-rule p-6">
        <h2 className="font-display text-lg font-bold">{t("approvals.empty.title")}</h2>
        <p className="mt-2 text-ink-soft">{t("approvals.empty.body")}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {decideFailed && <p className="text-stop">{t("approval.error")}</p>}
      {actions.map((action) => {
        const description = describeApproval(action);
        if (!description) return null;
        return (
          <div key={action.id} className="flex flex-col gap-2">
          <ApprovalCard
            title={t(KIND_LABEL_KEYS[description.kind])}
            rows={description.fields.map((field) => ({ label: t(FIELD_LABEL_KEYS[field.key]), value: field.value === CLEARED ? t("approval.cleared") : field.value }))}
            status="awaiting"
            confirmable={!description.unsafe}
            onConfirm={() => onDecide(action.id, "confirmed")}
            onReject={() => onDecide(action.id, "rejected")}
          />
          {description.unsafe && <p className="text-stop">{t("approval.unsafe")}</p>}
          </div>
        );
      })}
      {deciding && <p className="text-ink-soft">{t("approval.saving")}</p>}
    </div>
  );
};
