import type React from "react";
import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { Icon } from "@/ui/atoms/Icon";
import { useT } from "@/ui/hooks/useT";
import type { MessageKey } from "@/ui/i18n/uk";
import type { StatusLabelProps, VerdictStatus } from "./StatusLabel.types";

const GLYPH = { go: CircleCheck, caution: TriangleAlert, stop: CircleX } as const;
const COLOR: Record<VerdictStatus, string> = { go: "text-go", caution: "text-warn", stop: "text-stop" };
const KEY: Record<VerdictStatus, MessageKey> = { go: "status.go", caution: "status.caution", stop: "status.stop" };

export const StatusLabel: React.FC<StatusLabelProps> = ({ status }) => {
  const t = useT();
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${COLOR[status]}`}>
      <Icon icon={GLYPH[status]} />
      {t(KEY[status])}
    </span>
  );
};
