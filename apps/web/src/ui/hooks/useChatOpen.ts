"use client";

import { useCallback, useState } from "react";

export function useChatOpen(): { open: boolean; toggle: () => void } {
  const [open, setOpen] = useState(true);
  const toggle = useCallback(() => setOpen((current) => !current), []);
  return { open, toggle };
}
