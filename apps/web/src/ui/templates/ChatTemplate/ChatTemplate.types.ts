import type { ReactNode } from "react";

export type ChatTemplateProps = {
  title: string;
  account?: ReactNode;
  messages: ReactNode;
  status?: ReactNode;
  error?: ReactNode;
  composer: ReactNode;
};
