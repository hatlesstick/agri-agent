"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FORECAST_STORAGE_KEY } from "@/ui/helpers/forecast-memory";
import { forecastKeys } from "@/ui/queries/forecast-queries";
import { approvalKeys } from "@/ui/queries/approval-queries";
import { forgetMyData } from "@/ui/queries/privacy-queries";

export function useForgetMyData() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: forgetMyData,
    onSuccess: () => {
      try {
        window.localStorage.removeItem(FORECAST_STORAGE_KEY);
      } catch {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: forecastKeys.last });
      void queryClient.invalidateQueries({ queryKey: approvalKeys.list });
    },
  });
  return {
    run: () => mutation.mutate(),
    pending: mutation.isPending,
    failed: mutation.isError,
    result: mutation.data?.deleted ?? null,
  };
}
