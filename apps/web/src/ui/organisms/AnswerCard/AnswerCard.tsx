import type React from "react";
import { ConfidenceMeter } from "@/ui/molecules/ConfidenceMeter";
import { SourceList } from "@/ui/molecules/SourceList";
import type { AnswerCardProps } from "./AnswerCard.types";

export const AnswerCard: React.FC<AnswerCardProps> = ({ text, sources, confidence }) => (
  <article className="flex flex-col gap-3 rounded-[20px] border border-rule bg-surface p-4">
    <p className="leading-relaxed">{text}</p>
    <SourceList sources={sources} />
    <ConfidenceMeter value={confidence} />
  </article>
);
