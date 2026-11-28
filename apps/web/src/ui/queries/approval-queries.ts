import { decisionResponseSchema, pendingActionsResponseSchema, type DecisionResponse, type PendingActionsResponse } from "@agri/shared/contracts";

export const approvalKeys = {
  list: ["approvals", "list"] as const,
};

export class ApprovalRequestError extends Error {
  constructor(readonly status: number) {
    super(`approval request failed: ${status}`);
    this.name = "ApprovalRequestError";
  }
}

export async function fetchApprovals(): Promise<PendingActionsResponse> {
  const response = await fetch("/api/approvals", { cache: "no-store" });
  if (!response.ok) throw new ApprovalRequestError(response.status);
  return pendingActionsResponseSchema.parse(await response.json());
}

export async function decideApproval(id: string, decision: "confirmed" | "rejected"): Promise<DecisionResponse> {
  const path = decision === "confirmed" ? "confirm" : "reject";
  const response = await fetch(`/api/approvals/${encodeURIComponent(id)}/${path}`, { method: "POST" });
  if (!response.ok) throw new ApprovalRequestError(response.status);
  return decisionResponseSchema.parse(await response.json());
}
