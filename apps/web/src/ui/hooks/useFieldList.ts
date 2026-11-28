import { useQuery } from "@tanstack/react-query";
import { fetchFields, fieldKeys } from "@/ui/queries/field-queries";

export function useFieldList() {
  const query = useQuery({ queryKey: fieldKeys.list, queryFn: fetchFields });
  return {
    fields: query.data?.fields ?? [],
    loading: query.isPending,
    failed: query.isError,
  };
}
