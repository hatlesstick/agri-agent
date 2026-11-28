"use client";

import type React from "react";
import { useState } from "react";
import { useChatHistory } from "@/ui/hooks/useChatHistory";
import { useT } from "@/ui/hooks/useT";
import { Skeleton } from "@/ui/atoms/Skeleton";
import type { ConversationHistoryProps } from "./ConversationHistory.types";

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({ activeId, onOpen, onNew, onDeleted }) => {
  const t = useT();
  const history = useChatHistory();
  const [expanded, setExpanded] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function saveRename(id: string) {
    const title = draft.trim();
    if (title) history.rename(id, title);
    setRenamingId(null);
  }

  function confirmDelete(id: string) {
    history.remove(id);
    setConfirmingId(null);
    if (id === activeId) onDeleted(id);
  }

  return (
    <section aria-label={t("chat.history")} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="min-h-11 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-sky"
        >
          {t("chat.history")}
        </button>
        <button
          type="button"
          onClick={onNew}
          className="min-h-11 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-sky"
        >
          {t("chat.newConversation")}
        </button>
      </div>

      {expanded && (
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {history.loading && (
            <div aria-busy="true" className="flex flex-col gap-2 px-3 py-2">
              {[0, 1, 2].map((slot) => (
                <Skeleton key={slot} className="h-4 w-3/4" />
              ))}
            </div>
          )}
          {history.failed && <p className="px-3 text-sm text-stop">{t("chat.historyError")}</p>}
          {!history.loading && !history.failed && history.conversations.length === 0 && (
            <p className="px-3 text-sm text-ink-soft">{t("chat.historyEmpty")}</p>
          )}
          {history.conversations.map((conversation) => (
            <div key={conversation.id} className="flex flex-col gap-1 rounded-xl px-2 py-1">
              {renamingId === conversation.id ? (
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveRename(conversation.id);
                  }}
                >
                  <input
                    aria-label={t("chat.rename")}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-rule bg-surface px-2 py-1 text-sm"
                  />
                  <button type="submit" className="min-h-11 px-2 text-sm font-semibold">{t("chat.save")}</button>
                  <button type="button" onClick={() => setRenamingId(null)} className="min-h-11 px-2 text-sm">{t("chat.cancel")}</button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-current={conversation.id === activeId ? "true" : undefined}
                    onClick={() => onOpen(conversation.id)}
                    className={`min-h-11 min-w-0 flex-1 truncate rounded-lg px-2 text-left text-sm ${conversation.id === activeId ? "bg-brand-wash font-semibold" : "hover:bg-brand-wash"}`}
                  >
                    {conversation.title ?? t("chat.untitled")}
                  </button>
                  <button
                    type="button"
                    aria-label={t("chat.rename")}
                    onClick={() => {
                      setDraft(conversation.title ?? "");
                      setRenamingId(conversation.id);
                    }}
                    className="min-h-11 px-2 text-sm text-ink-soft"
                  >
                    {t("chat.rename")}
                  </button>
                  <button type="button" aria-label={t("chat.delete")} onClick={() => setConfirmingId(conversation.id)} className="min-h-11 px-2 text-sm text-ink-soft">
                    {t("chat.delete")}
                  </button>
                </div>
              )}
              {confirmingId === conversation.id && (
                <div className="flex items-center gap-2 px-2 text-sm">
                  <span>{t("chat.deleteConfirm")}</span>
                  <button type="button" onClick={() => confirmDelete(conversation.id)} className="min-h-11 px-2 font-semibold text-stop">{t("chat.delete")}</button>
                  <button type="button" onClick={() => setConfirmingId(null)} className="min-h-11 px-2">{t("chat.cancel")}</button>
                </div>
              )}
            </div>
          ))}
          {history.hasMore && (
            <button type="button" disabled={history.loadingMore} onClick={history.loadMore} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-brand-wash disabled:cursor-not-allowed disabled:opacity-60">
              {t("chat.loadMore")}
            </button>
          )}
        </div>
      )}
    </section>
  );
};
