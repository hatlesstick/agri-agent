import type { PendingAction } from "@agri/shared/contracts";

export type ApprovalsListProps = {
  actions: PendingAction[];
  loading: boolean;
  loadFailed: boolean;
  decideFailed: boolean;
  deciding: boolean;
  onDecide: (id: string, decision: "confirmed" | "rejected") => void;
};
