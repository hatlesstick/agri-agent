"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useChatHistory } from "@/ui/hooks/useChatHistory";
import { useT } from "@/ui/hooks/useT";
import { Button } from "@/ui/atoms/Button";
import { Icon } from "@/ui/atoms/Icon";
import { Skeleton } from "@/ui/atoms/Skeleton";
import type { ConversationHistoryProps } from "./ConversationHistory.types";

const ICON_BUTTON = "cursor-pointer grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-sky";

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({ activeId, onOpen, onNew, onDeleted }) => {
  const t = useT();
  const history = useChatHistory();
  const [expanded, setExpanded] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirmingId && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!confirmingId && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [confirmingId]);
  const activeTitle = history.conversations.find((conversation) => conversation.id === activeId)?.title;
  const formatDay = (iso: string) => new Intl.DateTimeFormat(t("chat.dateLocale"), { day: "numeric", month: "short" }).format(new Date(iso));

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
    <section aria-label={t("chat.history")} className="relative flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="conversation-history-list"
          onClick={() => setExpanded((value) => !value)}
          className="cursor-pointer flex min-h-11 min-w-0 items-center gap-1 rounded-xl px-2 text-left text-[15px] font-semibold text-ink hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-sky"
        >
          <span className="truncate">{activeTitle ?? t("chat.history")}</span>
          <Icon icon={ChevronDown} size={16} className={expanded ? "rotate-180 transition-transform motion-reduce:transition-none" : "transition-transform motion-reduce:transition-none"} />
        </button>
        <Button
          variant="secondary"
          onClick={() => {
            setExpanded(false);
            onNew();
          }}
          className="min-h-11 shrink-0 px-3 text-sm"
        >
          <Icon icon={Plus} size={16} />
          {t("chat.newConversation")}
        </Button>
      </div>

      {expanded && (
        <div id="conversation-history-list" className="absolute inset-x-0 top-full z-20 mt-2 flex max-h-[60dvh] flex-col gap-1 overflow-y-auto rounded-2xl border border-rule bg-surface p-2">
          {history.loading && (
            <div aria-busy="true" className="flex flex-col gap-2 px-2 py-2">
              {[0, 1, 2].map((slot) => (
                <Skeleton key={slot} className="h-4 w-3/4" />
              ))}
            </div>
          )}
          {history.failed && <p className="px-2 py-2 text-sm text-stop">{t("chat.historyError")}</p>}
          {!history.loading && !history.failed && history.conversations.length === 0 && (
            <p className="px-2 py-2 text-sm text-ink-soft">{t("chat.historyEmpty")}</p>
          )}
          {history.conversations.map((conversation) => {
            const active = conversation.id === activeId;
            return (
              <div key={conversation.id} className={`flex flex-col rounded-xl ${active ? "bg-brand-wash" : ""}`}>
                {renamingId === conversation.id ? (
                  <form
                    className="flex items-center gap-2 px-2 py-1"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveRename(conversation.id);
                    }}
                  >
                    <input
                      aria-label={t("chat.rename")}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-rule bg-surface px-3 text-sm"
                    />
                    <Button type="submit" variant="primary" className="min-h-11 px-3 text-sm">{t("chat.save")}</Button>
                    <Button variant="quiet" onClick={() => setRenamingId(null)} className="min-h-11 px-2 text-sm">{t("chat.cancel")}</Button>
                  </form>
                ) : (
                  <div className="flex items-center">
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => {
                        setExpanded(false);
                        onOpen(conversation.id);
                      }}
                      className="cursor-pointer flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-xl px-3 text-left focus-visible:outline-2 focus-visible:outline-sky"
                    >
                      <span className="truncate text-sm font-semibold text-ink">{conversation.title ?? t("chat.untitled")}</span>
                      <span className="text-xs tabular-nums text-ink-soft">{formatDay(conversation.updatedAt)}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={t("chat.rename")}
                      title={t("chat.rename")}
                      onClick={() => {
                        setDraft(conversation.title ?? "");
                        setRenamingId(conversation.id);
                      }}
                      className={ICON_BUTTON}
                    >
                      <Icon icon={Pencil} size={16} />
                    </button>
                    <button type="button" aria-label={t("chat.delete")} title={t("chat.delete")} onClick={() => setConfirmingId(conversation.id)} className={ICON_BUTTON}>
                      <Icon icon={Trash2} size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {history.hasMore && (
            <Button variant="quiet" disabled={history.loadingMore} onClick={history.loadMore} className="min-h-11 self-start px-3 text-sm">
              {t("chat.loadMore")}
            </Button>
          )}
        </div>
      )}
      <dialog
          ref={dialogRef}
          aria-labelledby="delete-conversation-title"
          onClose={() => setConfirmingId(null)}
          className="m-auto w-[min(92vw,360px)] rounded-2xl border border-rule bg-surface p-5 text-ink backdrop:bg-ink/40"
        >
          <form method="dialog" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 id="delete-conversation-title" className="font-display text-lg font-bold">{t("chat.deleteConfirm")}</h2>
              <p className="text-sm text-ink-soft">{t("chat.deleteBody")}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" autoFocus onClick={() => setConfirmingId(null)} className="min-h-11 px-4 text-sm">
                {t("chat.cancel")}
              </Button>
              <Button variant="primary" onClick={() => confirmingId && confirmDelete(confirmingId)} className="min-h-11 bg-stop px-4 text-sm text-paper">
                {t("chat.delete")}
              </Button>
            </div>
          </form>
        </dialog>
    </section>
  );
};
