import type { ReactNode } from "react";

export type ChatTemplateProps = {
  title: string;
  messages: ReactNode;
  status?: ReactNode;
  error?: ReactNode;
  composer: ReactNode;
};
