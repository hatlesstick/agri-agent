import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationKeys, deleteConversation, fetchConversationsPage, renameConversation } from "@/ui/queries/conversation-queries";

export function useChatHistory() {
  const queryClient = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: conversationKeys.list,
    queryFn: ({ pageParam }) => fetchConversationsPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: conversationKeys.list });
  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameConversation(id, title),
    onSettled: refresh,
  });
  const remove = useMutation({ mutationFn: deleteConversation, onSettled: refresh });

  return {
    conversations: list.data?.pages.flatMap((page) => page.conversations) ?? [],
    loading: list.isPending,
    failed: list.isError,
    hasMore: list.hasNextPage,
    loadingMore: list.isFetchingNextPage,
    loadMore: () => void list.fetchNextPage(),
    rename: (id: string, title: string) => rename.mutate({ id, title }),
    remove: (id: string) => remove.mutate(id),
  };
}
