"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/ui/atoms/Button";
import { useT } from "@/ui/hooks/useT";
import type { ForgetMyDataProps } from "@/ui/organisms/ForgetMyData/ForgetMyData.types";

export const ForgetMyData: React.FC<ForgetMyDataProps> = ({ pending, failed, result, onConfirm }) => {
  const t = useT();
  const [asking, setAsking] = useState(false);
  if (result) {
    return (
      <p className="text-sm text-ink-soft">
        {t("forget.done", { fields: result.fields, actions: result.actions, conversations: result.conversations })}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {!asking ? (
        <Button variant="quiet" onClick={() => setAsking(true)}>
          {t("forget.start")}
        </Button>
      ) : (
        <>
          <p className="text-sm">{t("forget.warning")}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={pending} onClick={onConfirm}>
              {t("forget.confirm")}
            </Button>
            <Button variant="quiet" disabled={pending} onClick={() => setAsking(false)}>
              {t("forget.cancel")}
            </Button>
          </div>
        </>
      )}
      {failed && <p className="text-sm text-stop">{t("forget.error")}</p>}
    </div>
  );
};
