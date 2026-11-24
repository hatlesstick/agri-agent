"use client";

import type React from "react";
import { useAccount } from "@/ui/hooks/useAccount";
import { AccountMenu } from "@/ui/molecules/AccountMenu";

export const AccountPanel: React.FC = () => {
  const account = useAccount();
  return <AccountMenu me={account.me} providers={account.providers} returnTo={account.returnTo} authError={account.authError} onSignOut={() => void account.signOut()} />;
};
