"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import type { ChatScrollerProps } from "./ChatScroller.types";

export const ChatScroller: React.FC<ChatScrollerProps> = ({ children, watch }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const area = ref.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [watch]);
  return (
    <div ref={ref} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-3 [scrollbar-gutter:stable] [scrollbar-width:thin]">
      {children}
    </div>
  );
};
