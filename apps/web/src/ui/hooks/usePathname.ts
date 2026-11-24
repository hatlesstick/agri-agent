"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
};

const currentPath = (): string => window.location.pathname;
const serverPath = (): string => "/";

export function usePathname(): string {
  return useSyncExternalStore(subscribe, currentPath, serverPath);
}
