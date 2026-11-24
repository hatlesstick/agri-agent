"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { AuthProvidersResponse, MeResponse } from "@agri/shared/contracts";
import { authErrorMessage, type SignInProvider } from "@/ui/helpers/account";

export type Account = {
  me: MeResponse | null;
  providers: SignInProvider[];
  authError: string | undefined;
  returnTo: string;
  signOut: () => Promise<void>;
};

const SERVER_HREF = "http://localhost/";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

const currentHref = (): string => window.location.href;
const serverHref = (): string => SERVER_HREF;

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export function useAccount(): Account {
  const href = useSyncExternalStore(subscribe, currentHref, serverHref);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [providers, setProviders] = useState<SignInProvider[]>([]);

  const location = useMemo(() => new URL(href), [href]);
  const authError = authErrorMessage(location.searchParams.get("auth_error")) ?? undefined;
  const returnTo = useMemo(() => {
    const url = new URL(location.href);
    url.searchParams.delete("auth_error");
    return `${url.pathname}${url.search}`;
  }, [location]);

  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    void getJson<AuthProvidersResponse>("/api/auth/providers").then((result) => {
      if (active) setProviders(result?.providers ?? []);
    });
    void getJson<MeResponse>("/api/me").then((result) => {
      if (active) setMe(result);
    });
    return () => {
      active = false;
    };
  }, [revision]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => undefined);
    setRevision((current) => current + 1);
  }, []);

  return { me, providers, authError, returnTo, signOut };
}
