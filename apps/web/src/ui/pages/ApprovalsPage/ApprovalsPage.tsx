"use client";

import type React from "react";
import { AppShell } from "@/ui/templates/AppShell";
import { AccountPanel } from "@/ui/organisms/AccountPanel";
import { ChatPanel } from "@/ui/organisms/ChatPanel";
import { ApprovalsList } from "@/ui/organisms/ApprovalsList";
import { useApprovalsPanel } from "@/ui/hooks/useApprovalsPanel";

export const ApprovalsPage: React.FC = () => {
  const panel = useApprovalsPanel();
  return (
    <AppShell
      main={
        <section className="flex flex-col gap-4">
          <ApprovalsList
            actions={panel.actions}
            loadFailed={panel.loadFailed}
            decideFailed={panel.decideFailed}
            deciding={panel.deciding}
            onDecide={(id, decision) => panel.decide(id, decision)}
          />
        </section>
      }
      account={<AccountPanel />}
      chat={<ChatPanel />}
    />
  );
};
