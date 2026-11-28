"use client";

import type React from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { QueryProviderProps } from "@/ui/organisms/QueryProvider/QueryProvider.types";

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
