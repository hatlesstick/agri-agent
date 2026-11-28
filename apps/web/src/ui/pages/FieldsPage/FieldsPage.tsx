"use client";

import type React from "react";
import { FieldTable } from "@/ui/organisms/FieldTable";
import { AppShell } from "@/ui/templates/AppShell";
import { AccountPanel } from "@/ui/organisms/AccountPanel";
import { ChatPanel } from "@/ui/organisms/ChatPanel";
import { useFieldList } from "@/ui/hooks/useFieldList";
import { useT } from "@/ui/hooks/useT";

export const FieldsPage: React.FC = () => {
  const t = useT();
  const fields = useFieldList();
  return (
    <AppShell
      main={
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-3xl font-bold">{t("fields.title")}</h1>
          <FieldTable fields={fields.fields} loading={fields.loading} failed={fields.failed} />
        </section>
      }
      account={<AccountPanel />}
      chat={<ChatPanel />}
    />
  );
};
