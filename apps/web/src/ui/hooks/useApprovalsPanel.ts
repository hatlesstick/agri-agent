"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PendingAction } from "@agri/shared/contracts";
import { approvalKeys, decideApproval, fetchApprovals } from "@/ui/queries/approval-queries";

const POLL_MS = 15_000;

export type ApprovalsPanel = {
  actions: PendingAction[];
  loading: boolean;
  loadFailed: boolean;
  deciding: boolean;
  decideFailed: boolean;
  decide: (id: string, decision: "confirmed" | "rejected") => void;
};

export function useApprovalsPanel(): ApprovalsPanel {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: approvalKeys.list,
    queryFn: fetchApprovals,
    refetchInterval: (query) => (query.state.data?.actions.length ? POLL_MS : false),
  });
  const decision = useMutation({
    mutationFn: ({ id, value }: { id: string; value: "confirmed" | "rejected" }) => decideApproval(id, value),
    onSettled: () => queryClient.invalidateQueries({ queryKey: approvalKeys.list }),
  });
  return {
    actions: list.data?.actions ?? [],
    loading: list.isPending,
    loadFailed: list.isError,
    deciding: decision.isPending,
    decideFailed: decision.isError,
    decide: (id, value) => decision.mutate({ id, value }),
  };
}
